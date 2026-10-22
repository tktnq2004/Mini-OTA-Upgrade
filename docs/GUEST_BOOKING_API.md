# Booking cho khách vãng lai — đặc tả API (FE đã làm trước, BE triển khai theo)

Mục tiêu: bỏ cách "xem/trả tiền booking bằng `bookingId` + `email`" (id tăng dần, đoán được → ai biết email
là xem được đơn người khác). Thay bằng: **khách vãng lai cũng có tài khoản + JWT** sau khi xác minh email bằng
OTP, mọi API booking kiểm tra quyền **duy nhất** bằng `booking.user_id = jwt.user.id`.

Hệ quả: `guestAccessToken` / header `X-Booking-Token` / cột `guest_access_token_hash` và
`GET /bookings/lookup` **không cần nữa** — khách vãng lai có token như user thường.

## 1. Quy tắc nghiệp vụ (đã chốt)

| Quy tắc | Chi tiết |
|---|---|
| Role | `RoleEnum.GUEST` (đã có) — khách đã xác minh email bằng OTP nhưng chưa đăng ký. Không dùng cột bit `isRegister`. |
| Khi nào xác minh | **Trước khi tạo booking** (chưa giữ phòng), lúc tra lịch sử, lúc mở lại trang thanh toán mà không có phiên. Đã có phiên còn hạn → bỏ qua. |
| Tạo user GUEST | Đúng OTP mà email chưa có user → tạo user `role=GUEST` với `fullName`, `email`, `phone` (không password). Email đã có user → giữ nguyên user đó. |
| Token cấp qua OTP | Mang **đúng role đang lưu trong DB** (email là CUSTOMER → token CUSTOMER = đăng nhập không mật khẩu, đã chốt chấp nhận). |
| Register | Luôn bắt OTP (đã có). Email đang là GUEST → đặt password + đổi `role=CUSTOMER`, không báo "email đã tồn tại". |
| Quyền booking | Mọi API đọc/ghi 1 booking: `booking.user.id == jwt.user.id` (ADMIN ngoại lệ), sai → `404`. Không nhận `email` từ request để quyết định quyền. |
| Quyền theo role | Role GUEST trong bảng Role/Permission chỉ có: `BOOKING_READ_OWN`, `BOOKING_CANCEL_OWN` + quyền tạo booking / tạo payment intent / sync của chính mình. **Không** có `/users/me/**`, `/payment/payment-methods/**`, admin. |
| Chống lạm dụng OTP | Gửi: giới hạn theo email **và** IP, trả `429` + `data.retryAfter` như các OTP hiện có. Mỗi mã: sống 5 phút, sai tối đa 5 lần rồi vô hiệu, lưu hash, dùng 1 lần. |
| Không lộ email | `send-otp` luôn trả `200 { exp }` giống nhau dù email có user/booking hay không. |

## 2. Auth — endpoint mới (thêm vào `PUBLIC_ENDPOINTS`)

Response bọc `RestResponse` như mọi API.

### `POST /api/v1/auth/guest/send-otp`

```json
{ "email": "khach@gmail.com" }
```
→ `200 { "data": { "exp": 300 } }`. Gửi lại quá sớm → `429 { "data": { "retryAfter": 42 } }`.

### `POST /api/v1/auth/guest/verify`

```json
{ "email": "khach@gmail.com", "otp": "123456", "fullName": "Nguyễn Văn A", "phone": "0912345678" }
```
- `fullName`, `phone`: có khi gọi từ checkout, **không có** khi gọi từ trang lịch sử / trang thanh toán. Chỉ dùng khi phải tạo user GUEST mới.
- Thành công → **giống hệt `/auth/login-mail`**: `200 { "data": { "access_token": "..." } }` + `Set-Cookie: refresh-token-Mini=...`.
- Sai/hết hạn mã → `400`/`401` kèm `error`.

### JWT

Dùng như `JwtUtils.createAccessToken(User)`: **phải có** claim `user` (`{id, email, name}` — `getIdUserLogin()`
đọc claim này) và claim `role` cấp ngoài = role trong DB. `JwtUtils.guestToken(email)` hiện tại **không dùng được**
(thiếu claim `user`, không có refresh token). FE đọc `role` cấp ngoài để ẩn Hồ sơ/Thẻ với GUEST.

## 3. Booking / thanh toán — tất cả **bắt buộc Bearer**

FE gọi qua proxy `/api/account/*` (luôn gắn Bearer, tự refresh, chuyển tiếp `Idempotency-Key`). Proxy
`/api/public` đã **bỏ POST**.

| Endpoint | Hiện tại (backend) | Cần đổi |
|---|---|---|
| `POST /bookings` | permitAll (`PUBLIC_POST_ENDPOINTS`), không token thì tạo booking khách + `guestAccessToken` | Bỏ khỏi `PUBLIC_POST_ENDPOINTS`, bắt buộc token. Luôn `booking.setUser(...)`; `guestFullName/Email/Phone` lưu làm thông tin liên hệ (snapshot), không quyết định quyền. Bỏ `issueGuestAccessToken`, nhánh replay của khách so theo user. Giữ `Idempotency-Key`. |
| `GET /bookings/{id}` | trả **entity** `Booking`, chỉ check permission, không check chủ | Trả `ResBookingDTO` (cùng DTO với `POST /bookings`, có `expirationTime`, `guestFullName/Email/Phone`). Không phải của mình → `404`. |
| `GET /bookings/me` | `BOOKING_READ_OWN` | Giữ nguyên, GUEST gọi được. Đề xuất `ORDER BY booking_date DESC LIMIT 20`, index `(user_id, booking_date DESC)`. |
| `PATCH /bookings/{id}/cancel` | `BOOKING_CANCEL_OWN` | GUEST có quyền này, check chủ booking. |
| `POST /payment/create-payment-intent` | permitAll, khách gửi `email` | Bắt buộc token, bỏ field `email`, check chủ booking. Body: `{ bookingId, paymentMethodId, saveCard }` hoặc `{ bookingId, provider: "SEPAY" }`. GUEST gửi `saveCard=true` → bỏ qua. |
| `POST /payments/{id}/sync` | permitAll, JWT chủ booking hoặc `X-Booking-Token` | Bắt buộc token, bỏ `X-Booking-Token`. FE gửi body `{}`. |
| `GET /bookings/lookup` | permitAll, `id + email` | **Xoá** (cả trong `PUBLIC_ENDPOINTS`). Còn để là còn lỗ dò `id + email`. |

## 4. Luồng FE (để BE đối chiếu)

1. **Checkout, chưa có phiên**: điền form → bấm đặt → `guest/send-otp` → nhập mã → `guest/verify` (kèm tên/sđt) → có cookie phiên → `POST /bookings` → chuyển `/checkout/payment?bookingId=123`.
2. **Checkout, đã có phiên** (CUSTOMER hoặc GUEST còn hạn): email khoá theo phiên → `POST /bookings` ngay.
3. **Trang thanh toán** `/checkout/payment?bookingId=123`: `GET /bookings/{id}` → `401` thì hiện form email + OTP tại chỗ → `guest/verify` → tải lại. `403/404` → "không tìm thấy / không thuộc tài khoản". Đếm ngược theo `expirationTime`.
4. **Lịch sử** `/account/bookings`: chưa có phiên → form email + OTP → `GET /bookings/me` → bấm 1 đơn → bước 3.

URL không còn mang `email`, `fullName`, `phone`.
