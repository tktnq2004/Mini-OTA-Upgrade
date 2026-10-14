# Discount — đặc tả API (FE đã làm trước, BE triển khai theo)

Mục tiêu: khách sạn tạo khuyến mãi → phòng hiện **tag** (tên + mức giảm) → giá được
giảm **lúc tạo booking** và **số tiền thanh toán** (Stripe/SePay) dùng đúng giá sau giảm.

## 1. Quy tắc nghiệp vụ (đã chốt)

| Quy tắc | Chi tiết |
|---|---|
| Mô hình | **1 lớp**: 1 discount = tên tag + giá trị + đơn vị + khoảng ngày + hotelId + danh sách phòng. Bỏ bảng `discount_details`. |
| Phạm vi phòng | `roomIds` rỗng = **mọi phòng** của hotel (kể cả phòng tạo sau). Có phần tử = chỉ các phòng đó, tất cả phải thuộc `hotelId`. |
| Khoảng ngày | Tính **theo từng đêm ở**. Đêm `D` được giảm nếu `startDate <= D <= endDate` (2 đầu **bao gồm**, `endDate` là đêm cuối được giảm). Booking 28/10→02/11 có các đêm 28,29,30,31/10 và 01/11. |
| Chồng khuyến mãi | Mỗi phòng × mỗi đêm chỉ áp **1** discount: cái **giảm nhiều tiền nhất**. Hoà → `startDate` sớm hơn, rồi `id` nhỏ hơn. Không cộng dồn, **không** chặn trùng khoảng ngày lúc tạo. |
| Cách tính 1 đêm | `PERCENT`: `round(price × value / 100)` (làm tròn HALF_UP về đồng). `FIXED_AMOUNT`: `min(value, price)` — giá 1 đêm không bao giờ âm. |
| `active=false` | Discount tắt tạm thời: không hiện tag, không áp khi tính tiền. |
| Snapshot | Giá + giảm giá **chốt lúc tạo booking**, lưu vào booking. Sửa/xoá discount sau đó KHÔNG đổi booking cũ. |
| Phân quyền theo hotel | `hotelId = 0` (admin hệ thống): thấy/sửa mọi discount, lúc tạo phải chọn hotel. `hotelId != 0` (owner/staff): chỉ thấy/sửa discount của đúng hotel mình; `hotelId` trong body bị bỏ qua (hoặc 403 nếu khác hotel mình). Permission giữ nguyên `DISCOUNT_CREATE/READ/UPDATE/DELETE`. |

## 2. Đối tượng `Discount` (dùng chung cho mọi response quản trị)

```json
{
  "id": 7,
  "hotelId": 3,
  "hotelName": "Trạm Đà Lạt",
  "name": "Ưu đãi mùa thu",
  "discountValue": 20,
  "discountUnit": "PERCENT",
  "startDate": "2026-11-01",
  "endDate": "2026-11-30",
  "active": true,
  "roomIds": [12, 13],
  "createdAt": "2026-10-15T08:30:00Z",
  "updatedAt": "2026-10-15T08:30:00Z",
  "createdBy": "owner@hotel.vn"
}
```

- `discountUnit`: `"PERCENT"` | `"FIXED_AMOUNT"` (giữ đúng tên field này cả ở request lẫn response — entity cũ đang trả `unit`, cần đổi).
- `roomIds`: `[]` = áp dụng mọi phòng.
- Mọi response vẫn bọc envelope `{statuscode, error, message, data}` như hiện tại.

## 3. Endpoint quản trị (cần JWT)

### 3.1 `GET /api/v1/discounts` — danh sách, phân trang — `DISCOUNT_READ`

Query: `page` (từ 1), `size`, `filter` (turkraft, FE gửi `name~'*abc*'` khi tìm kiếm), `hotelId` (tuỳ chọn, **chỉ admin** dùng để lọc 1 hotel; owner/staff bị BE ép về hotel của mình bất kể gửi gì).

Sắp xếp: `startDate` giảm dần (mới nhất lên đầu).

```json
{
  "statuscode": 200, "error": null, "message": "Get all discounts",
  "data": {
    "meta": { "current": 1, "pageSize": 10, "totalPages": 1, "total": 2 },
    "result": [ { "...Discount": "..." } ]
  }
}
```

### 3.2 `GET /api/v1/discounts/{id}` — `DISCOUNT_READ`
`data` = `Discount`. Discount của hotel khác (với owner/staff) → **404** (không để lộ là có tồn tại).

### 3.3 `POST /api/v1/discounts` — `DISCOUNT_CREATE`

```json
{
  "hotelId": 3,
  "name": "Ưu đãi mùa thu",
  "discountValue": 20,
  "discountUnit": "PERCENT",
  "startDate": "2026-11-01",
  "endDate": "2026-11-30",
  "roomIds": [12, 13],
  "active": true
}
```
→ **201**, `data` = `Discount` vừa tạo.

### 3.4 `PUT /api/v1/discounts/{id}` — `DISCOUNT_UPDATE`
Body giống POST (gửi đủ field, `hotelId` không đổi được — bỏ qua). Bật/tắt nhanh ở dashboard cũng gọi endpoint này với `active` đảo lại.
→ **200**, `data` = `Discount` sau khi sửa.

### 3.5 `DELETE /api/v1/discounts/{id}` — `DISCOUNT_DELETE`
→ **200**, `data: null`. Booking cũ đã snapshot nên không bị ảnh hưởng (FK từ `booking_rooms` → discount phải `ON DELETE SET NULL`, hoặc soft delete).

### 3.6 Validation (lỗi trả **400**, `error` là mảng chuỗi — FE hiển thị nguyên văn)

| Điều kiện | Thông báo gợi ý |
|---|---|
| `name` trống / > 50 ký tự | `Discount name is required` / `Discount name must be at most 50 characters` |
| `PERCENT` và không thuộc (0, 100) | `Discount value must be between 0 and 100` |
| `FIXED_AMOUNT` và `<= 0` | `Discount value must be greater than 0` |
| `startDate > endDate` | `Start date must be before or equal to end date` |
| Tạo mới với `endDate < hôm nay` | `End date must not be in the past` |
| `roomIds` có phòng không thuộc `hotelId` | `Room 99 does not belong to this hotel` |
| Admin tạo mà thiếu/`hotelId = 0`/hotel không tồn tại | `Hotel is required` / `This hotel is not exist` |

Sai hotel (owner/staff đụng discount hotel khác) → **403** `You are not allowed to ... this discount` (riêng GET/{id} → 404).

> Endpoint cũ `POST /room/{id}/discounts` và `DELETE /discounts` (gỡ khỏi phòng) **bỏ đi** — gán phòng giờ nằm trong `roomIds`.

## 4. Phía khách (public) — tag trên phòng

Thêm field `discounts` vào **mọi Room trả cho khách**: `GET /hotels/{id}` (`rooms[]`), `GET /rooms/{id}`, các room trong wishlist.
Chỉ gồm discount `active = true` **và** `endDate >= hôm nay` áp dụng cho phòng đó (kể cả discount `roomIds = []` của hotel). Rỗng thì trả `[]`.

```json
{
  "id": 12,
  "name": "Deluxe Twin",
  "price": 1000000,
  "...": "...",
  "discounts": [
    { "id": 7, "name": "Ưu đãi mùa thu", "discountValue": 20, "discountUnit": "PERCENT",
      "startDate": "2026-11-01", "endDate": "2026-11-30" }
  ]
}
```

FE tự tính **giá xem trước** theo đúng quy tắc mục 1 (file `src/lib/booking/discount.ts`) để hiện tag + giá gạch ngang + tổng ở checkout. Số tiền **thật** luôn là số BE trả lúc tạo booking (mục 5).

## 5. Booking — giảm giá lúc tính tiền

`POST /api/v1/bookings` và `GET /api/v1/bookings/lookup`: request **không đổi** (khách không nhập mã, BE tự áp discount theo quy tắc mục 1). Response `ResBookingDTO` thêm field:

```json
{
  "bookingId": 51,
  "checkIn": "2026-10-30",
  "checkOut": "2026-11-02",
  "status": "Pending",
  "nights": 3,
  "totalAmount": 1000000,
  "subtotalAmount": 3000000,
  "discountAmount": 400000,
  "payableAmount": 2600000,
  "rooms": [
    {
      "roomId": 12,
      "roomName": "Deluxe Twin",
      "pricePerNight": 1000000,
      "subtotal": 3000000,
      "discountAmount": 400000,
      "total": 2600000,
      "discounts": [
        { "discountId": 7, "name": "Ưu đãi mùa thu", "discountValue": 20, "discountUnit": "PERCENT",
          "nights": 2, "amount": 400000 }
      ]
    }
  ],
  "hotelName": "...", "hotelAddress": "...",
  "guestFullName": "...", "guestEmail": "...", "guestPhone": "..."
}
```

| Field | Ý nghĩa |
|---|---|
| `subtotalAmount` | Tổng giá gốc **cả kỳ ở** = Σ phòng (giá/đêm × số đêm) |
| `discountAmount` | Tổng tiền được giảm cả kỳ |
| `payableAmount` | **Số tiền phải trả** = `subtotalAmount - discountAmount`. FE ưu tiên field này; chưa có thì FE tự lùi về `totalAmount × nights` như cũ |
| `rooms[].discounts[]` | Mỗi discount đã áp cho phòng đó: áp mấy đêm, giảm bao nhiêu (để in hoá đơn) |
| `totalAmount` | Giữ nguyên nghĩa cũ (giá 1 đêm) cho tương thích, FE không còn dựa vào |

`GET /api/v1/bookings/me` (trang "Đặt phòng của tôi"): mỗi booking thêm `subtotalAmount`, `discountAmount`, `payableAmount` (cùng nghĩa như trên).

Lưu DB gợi ý: `bookings` thêm `SubtotalAmount`, `DiscountAmount`, `PayableAmount`; `booking_rooms.DiscountAmount` (đã có) + `discount_id` (nullable) + `DiscountName` (snapshot tên).

## 6. Thanh toán — dùng giá sau giảm

- `StripePayment.totalAmount`, `SePayPayment` (số tiền trong QR) và `BookingService.markPaidIfAmountMatches` (so tiền webhook SePay) **dùng `payableAmount`**, bỏ phép nhân `amount × nights`.
- Response `create-payment-intent` với `provider: "SEPAY"`: `amount` = `payableAmount` (FE hiển thị số này trong khung chuyển khoản).
- Stripe: `PaymentIntent.amount` = `payableAmount` (VND).

## 7. Checklist BE

- [ ] Migration: `discounts` thêm `hotel_id`, `name`, `start_date`, `end_date`, `active`, audit; bảng nối `discount_rooms(discount_id, room_id)`; bỏ `discount_details` (+ FK `booking_rooms.discount_detail_id`); bỏ `discounts.user_id`.
- [ ] CRUD mục 3 + lọc theo hotel của người gọi.
- [ ] `discounts` trong Room public (mục 4).
- [ ] Tính giá khi tạo booking + snapshot + field mới trong response (mục 5).
- [ ] Payment dùng `payableAmount` (mục 6).
