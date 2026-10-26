# Thanh toán trong web app e-commerce — từ ngoài vào trong

> Tài liệu học/thiết kế. Đi từ bức tranh toàn cảnh (ai cầm tiền, ai cầm thông tin) → từng trạm trong flow → database → backend → bảo mật, các ca lỗi, đối soát, vận hành.
> Ví dụ bám theo wen-go: đặt phòng khách sạn, trả bằng **thẻ (Stripe, manual capture)**, **chuyển khoản QR (SePay/VietQR)**, hoặc **trả tại khách sạn**.

---

## Mục lục

0. [Tư duy nền: 5 nguyên tắc vàng](#0-tư-duy-nền-5-nguyên-tắc-vàng)
1. [Bức tranh toàn cảnh: các bên tham gia](#1-bức-tranh-toàn-cảnh-các-bên-tham-gia)
2. [Vòng đời của tiền: authorize → capture → clearing → settlement → payout](#2-vòng-đời-của-tiền)
3. [Các loại phương thức thanh toán — mỗi loại một kiểu xác nhận](#3-các-loại-phương-thức-thanh-toán)
4. [Flow end-to-end từng trạm](#4-flow-end-to-end-từng-trạm)
5. [State machine: booking và payment](#5-state-machine)
6. [Database: cần bao nhiêu bảng, bảng nào, tại sao](#6-database)
7. [Backend: từng bước làm gì, nhận gì, xác minh gì](#7-backend-từng-bước)
8. [Webhook: đi sâu](#8-webhook-đi-sâu)
9. [Idempotency key: đi sâu](#9-idempotency-key-đi-sâu)
10. [Các trường hợp xảy ra (happy path và edge cases)](#10-các-trường-hợp-xảy-ra)
11. [Concurrency & race conditions](#11-concurrency--race-conditions)
12. [Bảo mật](#12-bảo-mật)
13. [Đối soát (reconciliation)](#13-đối-soát-reconciliation)
14. [Hoàn tiền, tranh chấp, chi trả cho đối tác](#14-hoàn-tiền-tranh-chấp-chi-trả-cho-đối-tác)
15. [Vận hành: log, metric, cảnh báo](#15-vận-hành-log-metric-cảnh-báo)
16. [Test & môi trường dev](#16-test--môi-trường-dev)
17. [Đặc thù Việt Nam](#17-đặc-thù-việt-nam)
18. [Checklist triển khai](#18-checklist-triển-khai)
19. [Thuật ngữ](#19-thuật-ngữ)

---

## 0. Tư duy nền: 5 nguyên tắc vàng

Nhớ 5 câu này thì phần còn lại chỉ là chi tiết:

1. **Không tin client.** Số tiền, đơn vị tiền, trạng thái "đã trả" đều do backend tính/quyết định. Client chỉ gửi *ý định* ("tôi muốn trả booking #123").
2. **Webhook (hoặc hỏi thẳng provider) là nguồn sự thật, không phải redirect/callback trên trình duyệt.** Trình duyệt có thể bị đóng, bị sửa URL, rớt mạng.
3. **Mọi thứ phải idempotent.** Webhook được gửi *ít nhất một lần* (at-least-once) → sẽ có trùng. Người dùng sẽ bấm 2 lần. Request sẽ timeout rồi retry. Xử lý 1 lần hay 10 lần phải ra cùng một kết quả.
4. **Trạng thái đi theo state machine, chỉ tiến không lùi.** Event đến sai thứ tự là chuyện bình thường.
5. **Tiền là số nguyên, đơn vị nhỏ nhất.** Không bao giờ dùng `float`/`double`. VND không có xu → `amount = 1500000` nghĩa là 1.500.000đ. USD → `amount = 1999` nghĩa là $19.99.

Thêm một nguyên tắc ngầm: **luôn có lưới an toàn**. Webhook có thể không bao giờ tới → phải có job đối soát chủ động hỏi provider.

---

## 1. Bức tranh toàn cảnh: các bên tham gia

```
                 THÔNG TIN (authorization request/response)
  ┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
  │ Khách    │───▶│ Frontend │───▶│ Payment    │───▶│ Acquirer │───▶│ Card      │───▶│ Issuer   │
  │ hàng     │    │ (Stripe  │    │ Gateway /  │    │ (ngân    │    │ network   │    │ (ngân    │
  │          │    │  .js)    │    │ PSP        │    │ hàng của │    │ Visa/MC/  │    │ hàng của │
  └──────────┘    └──────────┘    │ Stripe,    │    │ merchant)│    │ NAPAS     │    │ khách)   │
                       │          │ SePay,VNPay│    └──────────┘    └───────────┘    └──────────┘
                       │          └─────┬──────┘
                       │                │ webhook
                       ▼                ▼
                  ┌─────────────────────────┐        ┌──────────┐
                  │  Backend (merchant)     │───────▶│ Database │
                  └─────────────────────────┘        └──────────┘
```

| Bên | Vai trò | Ví dụ |
|---|---|---|
| **Customer / Cardholder** | Người trả tiền | Khách đặt phòng |
| **Merchant** | Người bán — **chính là app của bạn** | wen-go |
| **Payment Gateway / PSP** (Payment Service Provider) | Cổng kết nối merchant với hệ thống ngân hàng. Lo phần khó: nhận thẻ an toàn (PCI), 3DS, chống gian lận, gửi webhook | Stripe, VNPay, MoMo, SePay, PayOS, Adyen |
| **Acquirer** (ngân hàng thanh toán) | Ngân hàng nhận tiền thay merchant. Với Stripe, Stripe đứng ra lo luôn quan hệ với acquirer | |
| **Card Network / Switch** | Mạng chuyển mạch giữa các ngân hàng | Visa, Mastercard, JCB, NAPAS (nội địa VN) |
| **Issuer** (ngân hàng phát hành) | Ngân hàng của khách. **Quyết định duyệt hay từ chối**: đủ tiền không, có nghi gian lận không, có cần OTP/3DS không | Vietcombank, Techcombank... |

**Điểm quan trọng:** "bank core" (core banking của ngân hàng) **merchant không bao giờ nói chuyện trực tiếp**. Backend của bạn chỉ nói chuyện với PSP qua API + nhận webhook từ PSP. Mọi thứ phía sau PSP là hộp đen có SLA.

Hai luồng song song cần phân biệt:
- **Luồng thông tin** (vài giây): "giao dịch này được duyệt không?"
- **Luồng tiền thật** (1–7 ngày): tiền thực sự di chuyển từ issuer → network → acquirer → PSP → tài khoản ngân hàng của merchant.

---

## 2. Vòng đời của tiền

Với thanh toán thẻ, "khách trả tiền" thực ra là **5 bước** khác nhau:

| Bước | Diễn ra khi nào | Ý nghĩa | Tiền đã chuyển chưa? |
|---|---|---|---|
| **Authorization** (cấp phép) | Lúc khách bấm "Thanh toán" | Issuer xác nhận thẻ hợp lệ, đủ hạn mức, và **giữ (hold)** số tiền đó. Khách thấy "giao dịch chờ" trong app ngân hàng | Chưa. Chỉ bị giữ |
| **Capture** (chốt) | Ngay sau auth (auto) hoặc khi merchant gọi API (manual) | Merchant nói "tôi lấy số tiền đã giữ" | Chưa, nhưng đã cam kết |
| **Clearing** | Cuối ngày | Network gom các giao dịch đã capture, gửi cho issuer | Đang chuyển |
| **Settlement** | T+1 đến T+3 | Tiền thật đi từ issuer → acquirer → PSP | Có |
| **Payout** | Theo lịch PSP (vd. Stripe T+2..T+7) | PSP chuyển tiền vào tài khoản ngân hàng của merchant (đã trừ phí) | Có, về tay merchant |

### Auto capture vs Manual capture

- **Auto capture** (mặc định): auth xong capture luôn. Đơn giản. Phù hợp hàng có sẵn.
- **Manual capture** (wen-go đang dùng — trạng thái `PROCESSING` = Stripe `requires_capture`): auth trước, **kiểm tra lại điều kiện nghiệp vụ** (phòng còn không? booking còn hạn không?) rồi mới capture. Nếu không ổn → **cancel/void** khoản giữ.
  - Ưu: void một auth **không mất phí** và tiền nhả lại cho khách gần như ngay, còn refund một khoản đã capture thì mất phí và mất 5–10 ngày.
  - Nhược: auth có **hạn** (Stripe: thường 7 ngày với thẻ online). Quá hạn mà chưa capture → tự huỷ, mất tiền.
  - Dùng khi: đặt phòng, đặt vé, hàng cần xác nhận tồn kho, đơn cần duyệt thủ công.

### Chuyển khoản ngân hàng (VietQR) khác hoàn toàn

Thẻ là **pull payment** (merchant "kéo" tiền từ thẻ khách, có auth). Chuyển khoản là **push payment** (khách tự "đẩy" tiền sang):
- Không có auth/capture. Khách chuyển xong là tiền **đã nằm trong tài khoản merchant** (NAPAS 247, vài giây).
- Merchant không biết khách đã chuyển, trừ khi có ai đó báo → đây là việc của SePay/Casso/PayOS: họ theo dõi biến động số dư tài khoản ngân hàng của bạn và bắn webhook.
- Không có "huỷ" — tiền đã tới thì muốn trả lại phải **chủ động chuyển ngược**.
- Khách có thể chuyển **sai số tiền, sai nội dung, chuyển 2 lần, chuyển sau khi booking đã huỷ**. Backend phải xử lý được hết.

---

## 3. Các loại phương thức thanh toán

Mỗi loại có **cơ chế xác nhận** khác nhau — đây là thứ quyết định thiết kế backend:

| Loại | Ví dụ | Khách thao tác ở đâu | Backend biết "đã trả" qua đâu | Có huỷ/void được không |
|---|---|---|---|---|
| **Thẻ, form nhúng** | Stripe Elements | Ngay trên trang bạn (iframe của Stripe) + có thể bật popup 3DS | Webhook `payment_intent.*` + có thể chủ động gọi API hỏi | Có (trước capture) |
| **Redirect gateway** | VNPay, MoMo, ZaloPay | Bị chuyển sang trang của gateway rồi quay về `returnUrl` | **IPN** (webhook server-to-server). `returnUrl` chỉ để hiển thị, **không tin** | Tuỳ gateway |
| **Chuyển khoản / QR** | VietQR qua SePay, PayOS | App ngân hàng của khách | Webhook biến động số dư từ SePay | Không — chỉ hoàn bằng chuyển ngược |
| **Ví điện tử in-app** | Apple Pay, Google Pay | Popup hệ điều hành | Như thẻ (đi qua Stripe) | Có |
| **Offline** | Trả tại khách sạn, COD | Ngoài hệ thống | Nhân viên xác nhận thủ công | — |
| **BNPL / trả góp** | Kredivo, Fundiin | Redirect | Webhook | Tuỳ |

> Thiết kế tốt: backend có một interface `PaymentProvider` chung (`createPayment`, `getPayment`, `capture`, `cancel`, `refund`, `parseWebhook`) và mỗi provider là một adapter. Phần nghiệp vụ (booking, ledger) không biết đang dùng Stripe hay SePay.

---

## 4. Flow end-to-end từng trạm

### 4.1. Thẻ qua Stripe (PaymentIntent, manual capture) — flow chính của wen-go

```
 Khách      Frontend            Backend                    Stripe              Issuer
   │           │                   │                          │                   │
   │ chọn phòng│                   │                          │                   │
   │──────────▶│ ① POST /bookings  │                          │                   │
   │           │──────────────────▶│ tính giá ở server,       │                   │
   │           │                   │ giữ phòng, status=Pending│                   │
   │           │                   │ expires_at = now+15'     │                   │
   │           │◀──────────────────│ {bookingId, expiresAt}   │                   │
   │           │                   │                          │                   │
   │           │ ② POST /payment/create-payment-intent        │                   │
   │           │   {bookingId, paymentMethodId?, saveCard}    │                   │
   │           │──────────────────▶│ check chủ booking,       │                   │
   │           │                   │ còn hạn, chưa trả,       │                   │
   │           │                   │ lấy amount TỪ DB         │                   │
   │           │                   │ INSERT payments(CREATED) │                   │
   │           │                   │ ③ create PaymentIntent   │                   │
   │           │                   │   Idempotency-Key        │                   │
   │           │                   │   capture_method=manual  │                   │
   │           │                   │   metadata{bookingId,    │                   │
   │           │                   │            paymentId}    │                   │
   │           │                   │─────────────────────────▶│                   │
   │           │                   │◀─────────────────────────│ pi_xxx +          │
   │           │                   │ lưu provider_payment_id  │ client_secret     │
   │           │◀──────────────────│ {clientSecret}           │                   │
   │ nhập thẻ  │                   │                          │                   │
   │──────────▶│ ④ stripe.confirmCardPayment(clientSecret)    │                   │
   │           │   (số thẻ đi THẲNG từ iframe → Stripe,       │                   │
   │           │    KHÔNG qua backend của bạn)                │                   │
   │           │─────────────────────────────────────────────▶│ ⑤ authorization   │
   │           │                   │                          │──────────────────▶│
   │           │                   │                          │ cần 3DS?          │
   │ nhập OTP  │◀── popup 3DS ─────┼──────────────────────────│◀──────────────────│
   │──────────▶│──────────────────────────────────────────────▶──────────────────▶│
   │           │                   │                          │◀── approved ──────│
   │           │◀─────────────────────────────────────────────│ status=           │
   │           │ (FE chỉ biết "Stripe OK",                    │ requires_capture  │
   │           │  CHƯA phải "đã trả xong")                    │                   │
   │           │                   │ ⑥ webhook                │                   │
   │           │                   │ payment_intent.          │                   │
   │           │                   │ amount_capturable_updated│                   │
   │           │                   │◀─────────────────────────│                   │
   │           │                   │ verify chữ ký, dedupe,   │                   │
   │           │                   │ lock booking, re-check:  │                   │
   │           │                   │ còn hạn? phòng còn?      │                   │
   │           │                   │ ⑦ capture (hoặc cancel)  │                   │
   │           │                   │─────────────────────────▶│                   │
   │           │                   │ ⑧ webhook                │                   │
   │           │                   │ payment_intent.succeeded │                   │
   │           │                   │◀─────────────────────────│                   │
   │           │                   │ booking=Completed,       │                   │
   │           │                   │ ghi ledger, outbox email │                   │
   │           │ ⑨ POST /payments/{id}/sync (poll)            │                   │
   │           │──────────────────▶│ (hỏi Stripe nếu cần)     │                   │
   │           │◀──────────────────│ Completed                │                   │
   │ ✔ thành công                  │                          │                   │
```

**Từng trạm làm gì và tại sao:**

| Trạm | Ai | Việc | Tại sao |
|---|---|---|---|
| ① Tạo booking | BE | Tính giá **ở server** (giá phòng × đêm − discount + thuế/phí), **giữ chỗ** có thời hạn | Không cho client gửi giá. Giữ chỗ để 2 người không trả tiền cho cùng 1 phòng cuối cùng |
| ② Tạo intent | BE | Kiểm tra quyền + trạng thái, tạo bản ghi `payments` **trước** khi gọi Stripe | Có ID nội bộ để làm idempotency key và gắn vào metadata, kể cả khi gọi Stripe bị timeout |
| ③ Gọi Stripe | BE → Stripe | Tạo PaymentIntent với **secret key** (chỉ server có) | Client không thể tự tạo intent với số tiền tuỳ ý |
| ④ Confirm | FE → Stripe | Stripe.js gửi số thẻ thẳng tới Stripe | Server của bạn **không bao giờ chạm số thẻ** → giảm PCI scope xuống mức thấp nhất (SAQ A) |
| ⑤ Authorization | Stripe → Issuer | Issuer duyệt / từ chối / yêu cầu 3DS | |
| ⑥ Webhook auth | Stripe → BE | Báo "đã giữ tiền" | Đây mới là tín hiệu đáng tin |
| ⑦ Capture | BE → Stripe | Chốt tiền sau khi kiểm tra lại nghiệp vụ | Lý do dùng manual capture |
| ⑧ Webhook succeeded | Stripe → BE | Xác nhận đã chốt | Cập nhật booking, ghi sổ, gửi email |
| ⑨ Sync | FE → BE | FE hỏi trạng thái. BE có thể chủ động gọi Stripe để không phụ thuộc webhook | Cải thiện UX khi webhook chậm; là lưới an toàn thứ 2 |

### 4.2. Chuyển khoản VietQR qua SePay

```
 Khách        Frontend          Backend                 SePay          Ngân hàng (TK merchant)
   │             │                 │                       │                    │
   │             │ POST /payment/create-payment-intent     │                    │
   │             │ {bookingId, provider: SEPAY}            │                    │
   │             │────────────────▶│ sinh mã đối soát      │                    │
   │             │                 │ duy nhất, vd WG7F3K9Q │                    │
   │             │                 │ INSERT payments       │                    │
   │             │                 │ (PENDING, amount,     │                    │
   │             │                 │  reference=WG7F3K9Q)  │                    │
   │             │◀────────────────│ {qrImageUrl, bank,    │                    │
   │             │                 │  account, amount,     │                    │
   │             │                 │  transferContent}     │                    │
   │ quét QR     │                 │                       │                    │
   │ bằng app NH ───────────────── chuyển khoản NAPAS 247 ─────────────────────▶│
   │             │                 │                       │ theo dõi biến động │
   │             │                 │                       │◀───────────────────│
   │             │                 │ webhook {id, content, │                    │
   │             │                 │  transferAmount,      │                    │
   │             │                 │  transferType:"in",   │                    │
   │             │                 │  referenceCode...}    │                    │
   │             │                 │◀──────────────────────│                    │
   │             │                 │ verify API key,       │                    │
   │             │                 │ dedupe theo id,       │                    │
   │             │                 │ lưu bank_transactions,│                    │
   │             │                 │ tìm mã WG7F3K9Q trong │                    │
   │             │                 │ content → payment,    │                    │
   │             │                 │ so khớp số tiền       │                    │
   │             │                 │──▶ booking Completed  │                    │
   │             │                 │───────── 200 {success:true} ─────────────▶ │
   │             │ poll/SSE thấy   │                       │                    │
   │ ✔           │ Completed       │                       │                    │
```

Khác biệt cốt lõi so với thẻ:
- Không có capture: tiền **đã về**. Nếu booking đã hết hạn → phải **hoàn bằng tay/qua API ngân hàng**, không có "void".
- Việc ghép giao dịch với booking dựa vào **nội dung chuyển khoản** → mã đối soát phải ngắn, chữ + số, không ký tự đặc biệt (ngân hàng hay cắt/bỏ dấu), không dễ trùng, và **dò bằng regex** chứ không so khớp nguyên chuỗi (app ngân hàng có thể thêm prefix như `MBVCB.123456.WG7F3K9Q.CT tu...`).
- Phải lưu **mọi giao dịch tiền vào**, kể cả giao dịch không ghép được → hàng đợi xử lý thủ công.

### 4.3. Redirect gateway (VNPay/MoMo) — để so sánh

```
FE ──▶ BE: tạo payment → BE ký URL (HMAC-SHA512 với secret) → FE redirect sang VNPay
Khách trả trên VNPay
VNPay ──▶ BE: IPN (server-to-server, có chữ ký)   ← NGUỒN SỰ THẬT, cập nhật DB ở đây
VNPay ──▶ Trình duyệt: redirect về returnUrl?vnp_ResponseCode=00&...  ← CHỈ ĐỂ HIỂN THỊ
FE ở returnUrl ──▶ BE: "booking này thế nào rồi?" → BE trả trạng thái từ DB
```

Lỗi kinh điển: cập nhật "đã trả" ở `returnUrl`. Kẻ gian chỉ cần tự gõ `?vnp_ResponseCode=00` là có phòng miễn phí. Ngay cả khi có verify chữ ký trên returnUrl, khách đóng tab trước khi redirect xong thì đơn kẹt mãi ở Pending.

---

## 5. State machine

Viết state machine **trước khi viết code**. Mọi chỗ đổi trạng thái đều phải đi qua một hàm kiểm tra chuyển đổi hợp lệ.

### 5.1. Payment (một lần thử thanh toán)

```
                ┌──────────────┐
                │   CREATED    │  đã tạo bản ghi, chưa/đang gọi provider
                └──────┬───────┘
                       ▼
                ┌──────────────┐   cần 3DS/OTP
                │   PENDING    │◀──────────────┐
                └──┬───┬───┬───┘               │
     auth OK       │   │   │ thẻ bị từ chối ┌──┴─────────────┐
   (manual capture)│   │   └───────────────▶│ REQUIRES_ACTION│
                   ▼   │                    └────────────────┘
          ┌────────────┐│      ┌──────────┐
          │ AUTHORIZED ││      │  FAILED  │ (có thể thử lại bằng payment MỚI)
          └──┬──────┬──┘│      └──────────┘
     capture │      │ void/hết hạn auth
             ▼      ▼   │ (auto capture)
     ┌───────────┐ ┌──────────┐
     │ SUCCEEDED │◀┘ CANCELED │
     └─────┬─────┘ └──────────┘
           │ refund một phần / toàn bộ, chargeback
           ▼
  PARTIALLY_REFUNDED → REFUNDED        DISPUTED → WON / LOST
```

### 5.2. Booking (đơn hàng)

```
  PENDING (đang giữ chỗ, chờ trả) ──hết hạn, không có payment đang chạy──▶ CANCELLED
     │
     │ có auth (requires_capture)
     ▼
  PROCESSING ──re-check fail → void──▶ CANCELLED
     │
     │ capture OK / tiền chuyển khoản đã về đủ
     ▼
  COMPLETED ──khách huỷ / admin hoàn──▶ REFUND_PENDING ──▶ REFUNDED
```

Wen-go FE đang map đúng như vậy (`viewStateOf` trong [bookingViewState.ts](../src/app/checkout/payment/_lib/bookingViewState.ts)): `PROCESSING` → màn chờ, **không cho chọn phương thức lần nữa**.

### 5.3. Quy tắc chuyển trạng thái

```
ALLOWED = {
  CREATED:         [PENDING, FAILED, CANCELED],
  PENDING:         [REQUIRES_ACTION, AUTHORIZED, SUCCEEDED, FAILED, CANCELED],
  REQUIRES_ACTION: [PENDING, AUTHORIZED, SUCCEEDED, FAILED, CANCELED],
  AUTHORIZED:      [SUCCEEDED, CANCELED],
  SUCCEEDED:       [PARTIALLY_REFUNDED, REFUNDED, DISPUTED],
  ...
  FAILED, CANCELED, REFUNDED: []   // trạng thái cuối
}

transition(payment, to):
  if to == payment.status: return NOOP          // idempotent: event trùng
  if to not in ALLOWED[payment.status]: return IGNORE_AND_LOG   // event cũ đến muộn
  payment.status = to; insert payment_status_history; ...
```

Ví dụ event đến sai thứ tự: `payment_intent.succeeded` đến trước `payment_intent.processing` → khi `processing` đến sau, `SUCCEEDED → PENDING` không hợp lệ → bỏ qua. Không có quy tắc này, booking đã trả có thể bị "lùi" về chờ.

---

## 6. Database

### 6.1. Tổng quan: MVP vs production

| # | Bảng | MVP | Production | Chức năng một câu |
|---|---|:-:|:-:|---|
| 1 | `bookings` (orders) | ✅ | ✅ | Đơn hàng: bán cái gì, bao nhiêu tiền, trạng thái nghiệp vụ |
| 2 | `payments` | ✅ | ✅ | Mỗi **lần thử** thanh toán cho một đơn |
| 3 | `payment_webhook_events` | ✅ | ✅ | Hộp thư đến của webhook: chống trùng + audit + replay |
| 4 | `refunds` | ✅ | ✅ | Mỗi lần hoàn tiền |
| 5 | `payment_status_history` | ⚪ | ✅ | Lịch sử đổi trạng thái, ai đổi, vì sao |
| 6 | `saved_payment_methods` | ⚪ | ✅ | Thẻ đã lưu (chỉ token + last4), cho "dùng thẻ đã lưu" |
| 7 | `bank_transactions` | ✅ nếu có chuyển khoản | ✅ | Mọi giao dịch tiền vào từ SePay, kể cả giao dịch không ghép được |
| 8 | `idempotency_keys` | ⚪ | ✅ | Chống trùng request từ client (double-click, retry) |
| 9 | `outbox_events` | ⚪ | ✅ | Gửi email/thông báo/event một cách tin cậy sau khi commit |
| 10 | `ledger_accounts` + `ledger_entries` | ❌ | ✅ | Sổ cái kép: tiền đang nằm ở đâu, nợ ai |
| 11 | `disputes` | ❌ | ✅ | Chargeback từ ngân hàng của khách |
| 12 | `payouts` + `partner_balances` | ❌ | ✅ (marketplace) | Chi trả tiền cho khách sạn (đối tác) sau khi trừ hoa hồng |
| 13 | `reconciliation_runs` + `reconciliation_items` | ❌ | ✅ | Kết quả đối soát với báo cáo của provider |

**Tối thiểu: 4–5 bảng** (bookings, payments, webhook_events, refunds, + bank_transactions nếu có chuyển khoản). **Production đầy đủ: ~12–15 bảng.**

Câu hỏi hay gặp: *sao không gộp payment vào bookings cho gọn?* Vì **một booking có nhiều lần thử**: thẻ bị từ chối → thử thẻ khác → đổi sang QR. Mỗi lần là một PaymentIntent khác nhau ở Stripe. Gộp lại thì mất lịch sử, không đối soát được, và không xử lý được "khách trả 2 lần".

### 6.2. `bookings` — các field liên quan đến thanh toán

```sql
-- Chỉ liệt kê field liên quan đến thanh toán
CREATE TABLE bookings (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id),
  hotel_id         BIGINT NOT NULL,
  status           VARCHAR(20) NOT NULL,      -- PENDING/PROCESSING/COMPLETED/CANCELLED/REFUND_PENDING/REFUNDED
  subtotal_amount  BIGINT NOT NULL,           -- trước giảm giá
  discount_amount  BIGINT NOT NULL DEFAULT 0,
  tax_amount       BIGINT NOT NULL DEFAULT 0,
  total_amount     BIGINT NOT NULL CHECK (total_amount >= 0),  -- SỐ TIỀN PHẢI TRẢ (snapshot)
  currency         CHAR(3) NOT NULL DEFAULT 'VND',
  price_snapshot   JSONB,                     -- giá từng đêm, mã discount đã áp... tại thời điểm đặt
  payment_option   VARCHAR(20),               -- PAY_NOW / PAY_AT_HOTEL
  expires_at       TIMESTAMPTZ,               -- hạn giữ chỗ (wen-go: expirationTime)
  paid_at          TIMESTAMPTZ,
  version          INT NOT NULL DEFAULT 0,    -- optimistic lock
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_pending_expiry ON bookings (expires_at) WHERE status = 'PENDING';
```

Tại sao:
- `total_amount` là **snapshot**: giá phòng ngày mai đổi thì đơn hôm nay vẫn giữ giá cũ. Payment luôn so với số này.
- `price_snapshot`: giải quyết khiếu nại ("sao tôi bị tính X?") và làm hoá đơn.
- `expires_at` + partial index: scheduler quét booking hết hạn nhanh mà không scan cả bảng.
- `version`: chống 2 tiến trình (webhook vs scheduler) cùng ghi đè.

### 6.3. `payments` — bảng quan trọng nhất

```sql
CREATE TABLE payments (
  id                   BIGSERIAL PRIMARY KEY,
  public_id            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), -- lộ ra ngoài thay cho id tăng dần
  booking_id           BIGINT NOT NULL REFERENCES bookings(id),
  user_id              BIGINT NOT NULL REFERENCES users(id),
  provider             VARCHAR(20) NOT NULL,         -- STRIPE / SEPAY / VNPAY / PAY_AT_HOTEL
  method_type          VARCHAR(20),                  -- card / bank_transfer / wallet
  provider_payment_id  VARCHAR(255),                 -- pi_xxx (Stripe), mã đối soát (SePay)
  idempotency_key      VARCHAR(255) NOT NULL UNIQUE, -- gửi kèm khi gọi provider
  amount               BIGINT NOT NULL CHECK (amount > 0),
  amount_received      BIGINT NOT NULL DEFAULT 0,    -- thực nhận (chuyển khoản có thể thiếu/thừa)
  amount_refunded      BIGINT NOT NULL DEFAULT 0,
  currency             CHAR(3) NOT NULL,
  status               VARCHAR(20) NOT NULL,         -- theo state machine mục 5.1
  capture_method       VARCHAR(10),                  -- automatic / manual
  authorized_at        TIMESTAMPTZ,
  captured_at          TIMESTAMPTZ,
  auth_expires_at      TIMESTAMPTZ,                  -- hạn của khoản giữ, phải capture trước mốc này
  failure_code         VARCHAR(100),                 -- card_declined, insufficient_funds...
  failure_message      TEXT,
  card_brand           VARCHAR(20),                  -- visa (để hiển thị, KHÔNG phải dữ liệu nhạy cảm)
  card_last4           CHAR(4),
  provider_customer_id VARCHAR(255),                 -- cus_xxx
  metadata             JSONB,
  version              INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);
CREATE INDEX idx_payments_booking ON payments (booking_id);
-- Mỗi booking chỉ có tối đa 1 payment "đang sống" → chặn tạo 2 intent song song ngay ở DB
CREATE UNIQUE INDEX uq_payments_one_active_per_booking
  ON payments (booking_id)
  WHERE status IN ('CREATED','PENDING','REQUIRES_ACTION','AUTHORIZED');
```

Field quan trọng và lý do:

| Field | Tại sao cần |
|---|---|
| `provider_payment_id` + `UNIQUE(provider, …)` | Webhook gửi tới mang `pi_xxx` → tra ngược ra payment. Unique để không bao giờ có 2 dòng cho 1 giao dịch |
| `idempotency_key` | Gọi Stripe bị timeout → retry với **cùng key** → Stripe trả lại intent cũ, không tạo intent thứ 2 |
| `amount` vs `amount_received` | Chuyển khoản có thể thiếu/thừa. Thẻ thì thường bằng nhau |
| `amount_refunded` | Hỗ trợ hoàn một phần; chặn hoàn vượt số đã nhận |
| `auth_expires_at` | Manual capture: job cảnh báo/capture trước khi auth tự hết hạn |
| `failure_code` | Hiển thị lý do cho khách ("thẻ không đủ tiền"), thống kê tỉ lệ từ chối |
| Partial unique index | Double-click "Thanh toán" sinh 2 request đồng thời → request thứ hai vướng unique → trả lại payment đang có |
| `public_id` | Không lộ ID tăng dần ra URL (tránh dò `/payments/1`, `/payments/2`...) |

**Không bao giờ lưu:** số thẻ đầy đủ (PAN), CVV, ngày hết hạn đi kèm PAN, `client_secret` (không cần lưu, lấy lại từ Stripe được), secret key.

### 6.4. `payment_webhook_events` — inbox

```sql
CREATE TABLE payment_webhook_events (
  id               BIGSERIAL PRIMARY KEY,
  provider         VARCHAR(20) NOT NULL,
  event_id         VARCHAR(255) NOT NULL,   -- evt_xxx (Stripe), id giao dịch (SePay)
  event_type       VARCHAR(100) NOT NULL,   -- payment_intent.succeeded
  provider_object_id VARCHAR(255),          -- pi_xxx, để tìm nhanh
  payload          JSONB NOT NULL,          -- nguyên văn, để debug & replay
  status           VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',  -- RECEIVED/PROCESSED/IGNORED/FAILED
  attempts         INT NOT NULL DEFAULT 0,
  last_error       TEXT,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at     TIMESTAMPTZ,
  UNIQUE (provider, event_id)
);
```

Tại sao:
- `UNIQUE(provider, event_id)` là **cơ chế chống trùng chính**. Stripe gửi lại cùng một event (retry, hoặc gửi trùng do lỗi mạng) → `INSERT ... ON CONFLICT DO NOTHING` → biết ngay là đã nhận rồi.
- `payload` thô: khi có bug, sửa code rồi **replay** lại event từ DB mà không cần nhờ provider gửi lại.
- `status`/`attempts`/`last_error`: thấy event nào xử lý lỗi, retry có kiểm soát.

### 6.5. `refunds`

```sql
CREATE TABLE refunds (
  id                 BIGSERIAL PRIMARY KEY,
  payment_id         BIGINT NOT NULL REFERENCES payments(id),
  booking_id         BIGINT NOT NULL REFERENCES bookings(id),
  provider_refund_id VARCHAR(255),          -- re_xxx; với chuyển khoản: mã GD chuyển ngược
  idempotency_key    VARCHAR(255) NOT NULL UNIQUE,
  amount             BIGINT NOT NULL CHECK (amount > 0),
  currency           CHAR(3) NOT NULL,
  reason             VARCHAR(50) NOT NULL,  -- CUSTOMER_CANCEL / DUPLICATE / LATE_PAYMENT / OVERPAID / FRAUD
  status             VARCHAR(20) NOT NULL,  -- PENDING / SUCCEEDED / FAILED / MANUAL_REQUIRED
  requested_by       BIGINT,                -- user/admin bấm hoàn → audit
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_refund_id)
);
```

- Tách bảng vì một payment có thể **hoàn nhiều lần** (hoàn một phần theo chính sách huỷ).
- `reason` để báo cáo và kế toán.
- `MANUAL_REQUIRED`: chuyển khoản không hoàn tự động được → kế toán xử lý tay.

### 6.6. `saved_payment_methods`

```sql
CREATE TABLE saved_payment_methods (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES users(id),
  provider              VARCHAR(20) NOT NULL,
  provider_customer_id  VARCHAR(255) NOT NULL,   -- cus_xxx
  provider_method_id    VARCHAR(255) NOT NULL,   -- pm_xxx (token, không phải số thẻ)
  brand                 VARCHAR(20),
  last4                 CHAR(4),
  exp_month             SMALLINT,
  exp_year              SMALLINT,
  fingerprint           VARCHAR(64),             -- Stripe cho, để phát hiện cùng 1 thẻ lưu 2 lần
  is_default            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  UNIQUE (provider, provider_method_id)
);
```

- `provider_customer_id` nên đặt trên `users` (một user ↔ một Stripe Customer).
- **Bắt buộc kiểm tra** khi client gửi `paymentMethodId`: pm đó phải thuộc user đang đăng nhập. Không kiểm tra = user A trả bằng thẻ của user B nếu đoán được `pm_xxx` (IDOR).

### 6.7. `bank_transactions` (cho SePay/chuyển khoản)

```sql
CREATE TABLE bank_transactions (
  id                 BIGSERIAL PRIMARY KEY,
  provider           VARCHAR(20) NOT NULL DEFAULT 'SEPAY',
  provider_txn_id    VARCHAR(100) NOT NULL,     -- id SePay gửi
  bank_reference     VARCHAR(100),              -- mã tham chiếu của ngân hàng
  account_number     VARCHAR(50) NOT NULL,      -- TK nhận (có thể có nhiều TK)
  direction          VARCHAR(3) NOT NULL,       -- in / out
  amount             BIGINT NOT NULL,
  content            TEXT,                      -- nội dung chuyển khoản nguyên văn
  transaction_at     TIMESTAMPTZ NOT NULL,
  matched_payment_id BIGINT REFERENCES payments(id),
  match_status       VARCHAR(20) NOT NULL,      -- MATCHED / UNMATCHED / AMOUNT_MISMATCH / LATE / DUPLICATE / IGNORED
  raw_payload        JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_txn_id)
);
```

Tại sao không ghi thẳng vào `payments`: vì **tiền vào trước, ghép sau**. Có giao dịch không ghép được (khách gõ sai nội dung), có giao dịch không liên quan (ai đó chuyển nhầm). Mọi đồng tiền vào tài khoản đều phải có dấu vết.

### 6.8. Các bảng production

**`payment_status_history`**: `(id, payment_id, from_status, to_status, source [WEBHOOK/SYNC/SCHEDULER/ADMIN/API], event_id, actor_id, reason, created_at)`. Trả lời được câu hỏi "vì sao booking này bị huỷ lúc 10:03?".

**`idempotency_keys`**: `(key, user_id, endpoint, request_hash, response_status, response_body, locked_until, created_at)`. Client gửi header `Idempotency-Key: <uuid>`. Request lần 2 cùng key → trả lại response đã lưu. Cùng key nhưng body khác → 422.

**`outbox_events`**: `(id, aggregate_type, aggregate_id, event_type, payload, status, attempts, created_at, published_at)`. Ghi **trong cùng transaction** với việc đổi trạng thái booking. Worker riêng đọc ra để gửi email/push/Kafka. Giải quyết bài toán: "DB commit xong nhưng gửi email lỗi" hoặc "gửi email xong nhưng DB rollback".

**`ledger_accounts` + `ledger_entries`** (sổ cái kép):
```
ledger_entries(id, txn_group_id, account_id, debit, credit, currency, ref_type, ref_id, created_at)
-- Mỗi txn_group: tổng debit = tổng credit
Ví dụ khách trả 1.000.000đ, phí Stripe 30.000đ, hoa hồng nền tảng 15%:
  Nợ  stripe_receivable        1.000.000
  Có  partner_payable:hotel_9    850.000
  Có  platform_revenue           150.000
Khi Stripe payout:
  Nợ  bank_cash                  970.000
  Nợ  payment_fees                30.000
  Có  stripe_receivable        1.000.000
```
Không bắt buộc với app nhỏ, nhưng **bắt buộc khi là marketplace** (thu hộ rồi trả lại cho khách sạn): phải biết chính xác mình đang nợ mỗi khách sạn bao nhiêu.

**`disputes`**: `(id, payment_id, provider_dispute_id, amount, reason, status, evidence_due_by, ...)`.

**`payouts` / `partner_balances`**: chi trả cho đối tác theo kỳ.

**`reconciliation_runs` / `reconciliation_items`**: kết quả đối chiếu hằng ngày (xem mục 13).

---

## 7. Backend từng bước

### Bước 0 — Chuẩn bị (trước khi viết dòng code nghiệp vụ nào)

- Tạo tài khoản provider, lấy **test keys** và **live keys**, cất vào secret manager hoặc biến môi trường (không commit).
  - Stripe: `sk_test_...` (server), `pk_test_...` (FE được dùng), `whsec_...` (secret ký webhook, **mỗi endpoint một secret riêng**).
  - SePay: API key cho webhook, thông tin tài khoản nhận.
- Đăng ký **webhook endpoint** (HTTPS bắt buộc ở live) và chọn đúng loại event cần nghe.
- Quyết định: auto hay manual capture, thời hạn giữ chỗ, chính sách huỷ/hoàn, có lưu thẻ không.
- Vẽ state machine (mục 5). Tạo migration các bảng.

### Bước 1 — Tạo booking (`POST /bookings`)

**Nhận:** `hotelId, roomTypeId, checkIn, checkOut, guests, discountCode?, paymentOption`.
**Không nhận:** giá. Nếu FE gửi giá để hiển thị thì backend vẫn tự tính lại và **so sánh**: lệch → trả lỗi "giá đã thay đổi, vui lòng xem lại" thay vì âm thầm tính giá khác.

**Làm:**
1. Validate input (ngày hợp lệ, checkIn ≥ hôm nay, số khách ≤ sức chứa).
2. Tính giá ở server: giá từng đêm (có thể khác nhau cuối tuần/mùa), discount (kiểm tra còn hạn, còn lượt, đúng hotel, đúng user), thuế/phí. Làm tròn **một lần, ở cuối**, theo quy tắc rõ ràng.
3. **Giữ chỗ (inventory hold)** một cách nguyên tử, ví dụ:
   ```sql
   UPDATE room_inventory
   SET held = held + 1
   WHERE room_type_id = ? AND date BETWEEN ? AND ?
     AND total - booked - held >= 1;
   -- số dòng bị ảnh hưởng phải bằng số đêm, nếu không → rollback, báo hết phòng
   ```
   Hoặc `SELECT ... FOR UPDATE`. Tuyệt đối không "đọc ra rồi kiểm tra trong code rồi mới ghi" → oversell khi đông người đặt.
4. Lưu booking `PENDING`, `expires_at = now + 15 phút` (tuỳ phương thức: QR có thể cần dài hơn thẻ).
5. Trừ lượt discount (hoặc giữ lượt, nhả lại khi huỷ).

**Trả:** `bookingId, totalAmount, currency, expiresAt`.

### Bước 2 — Tạo payment (`POST /payment/create-payment-intent`)

**Nhận:** `bookingId, provider, paymentMethodId?, saveCard`, header `Idempotency-Key` (khuyến nghị).

**Xác minh (theo thứ tự, fail sớm):**
1. Đã đăng nhập (với khách vãng lai: token GUEST sau OTP).
2. **Booking thuộc về user này** → nếu không thì trả 404 (không phải 403, tránh lộ là booking đó tồn tại).
3. Booking `status = PENDING` và `expires_at > now` (cộng một khoảng đệm, vd. còn ít nhất 1 phút).
4. Nếu có `paymentMethodId`: pm đó thuộc Stripe Customer của user này.
5. Provider được phép với booking này (vd. khách sạn tắt chuyển khoản).

**Làm:**
1. Tìm payment "đang sống" của booking:
   - Có, cùng provider, cùng số tiền → **trả lại cái cũ** (lấy lại `client_secret` từ Stripe). Đây là idempotency ở mức nghiệp vụ: F5 trang, mở 2 tab cũng chỉ có 1 intent.
   - Có, nhưng khác provider (chuyển từ thẻ sang QR) → huỷ cái cũ trước (Stripe `cancel`), hoặc cho phép song song nhưng phải xử lý được "trả 2 lần" (mục 10).
2. `INSERT payments (status=CREATED, amount = booking.total_amount, idempotency_key = "pay_" + payment.public_id)`. **Commit.**
3. Gọi provider:
   ```
   stripe.paymentIntents.create({
     amount: booking.total_amount,      // VND là zero-decimal: 1500000 = 1.500.000đ
     currency: "vnd",
     capture_method: "manual",
     customer: user.stripe_customer_id,
     payment_method: paymentMethodId,   // nếu dùng thẻ đã lưu
     setup_future_usage: saveCard ? "off_session" : undefined,
     metadata: { booking_id, payment_id },
     description: "Booking #123",
   }, { idempotencyKey: payment.idempotency_key })
   ```
4. Lưu `provider_payment_id = pi_xxx`, `status = PENDING`.
5. **Trả về** chỉ những gì FE cần: `clientSecret`, `paymentId`. Không trả secret key, không trả nguyên object Stripe.

**Nếu gọi Stripe bị timeout/5xx:** trạng thái là **không biết** (có thể Stripe đã tạo intent). Đừng đánh dấu FAILED. Retry với **cùng idempotency key** → Stripe trả lại kết quả lần trước. Hết lượt retry → trả lỗi cho FE, payment giữ `CREATED`; job đối soát sẽ dọn (dùng Stripe Search theo `metadata['payment_id']`). Wen-go có nhắc đến Stripe Search trong `BookingExpirationService` — chính là để xử lý tình huống này.

**Với SePay:** không gọi API nào cả, chỉ sinh mã đối soát + dựng URL ảnh VietQR (`https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=WG7F3K9Q`).

### Bước 3 — Client confirm (backend không tham gia)

FE gọi `stripe.confirmCardPayment(clientSecret, …)`. Có thể bật 3DS. Kết quả ở FE **chỉ để điều hướng UI**: thành công → sang màn "đang xử lý" và poll; thất bại → hiện lỗi, cho thử lại với cùng intent hoặc thẻ khác.

### Bước 4 — Nhận webhook → xem mục 8

### Bước 5 — Capture (chỉ khi manual capture)

Khi nhận `payment_intent.amount_capturable_updated` (status `requires_capture`):
```
BEGIN
  booking = SELECT ... FROM bookings WHERE id = ? FOR UPDATE
  payment = SELECT ... FROM payments WHERE id = ? FOR UPDATE
  if payment.status already AUTHORIZED/SUCCEEDED: COMMIT; return     // trùng
  verify amount_capturable == payment.amount && currency khớp
  payment → AUTHORIZED; booking → PROCESSING
COMMIT

// gọi provider NGOÀI transaction (đừng giữ lock DB trong lúc gọi mạng)
if booking vẫn hợp lệ (chưa huỷ, phòng vẫn giữ):
    stripe.capture(pi, idempotencyKey = "cap_" + payment.public_id)
else:
    stripe.cancel(pi, idempotencyKey = "void_" + payment.public_id)
// trạng thái cuối cập nhật khi webhook succeeded/canceled tới (hoặc từ response, cùng handler)
```

### Bước 6 — Chốt đơn khi thành công

Trong **một transaction**:
- `payments.status = SUCCEEDED, captured_at, amount_received`
- `bookings.status = COMPLETED, paid_at`; chuyển inventory `held → booked`
- Ghi `payment_status_history`, `ledger_entries`
- Ghi `outbox_events` (`BOOKING_CONFIRMED` → email xác nhận, thông báo cho khách sạn, xuất hoá đơn)

Commit xong mới trả 200 cho webhook.

### Bước 7 — Endpoint sync (`POST /payments/{bookingId}/sync`)

FE gọi sau khi confirm, poll vài giây một lần (wen-go: 3s, tối đa 40 lần). Backend:
1. Kiểm tra quyền (chủ booking).
2. Nếu payment đã ở trạng thái cuối → trả luôn.
3. Nếu chưa → **gọi Stripe `retrieve(pi)`** và cho kết quả đi qua **chính handler của webhook** (cùng một hàm `applyProviderState(payment, providerObject)`).
4. Rate limit endpoint này (nó gọi ra Stripe).

Điểm mấu chốt: **một đường xử lý duy nhất** cho cả webhook, sync và cron. Ba đường code riêng = ba nơi sinh bug khác nhau.

### Bước 8 — Hết hạn giữ chỗ (scheduler)

Mỗi 30s–1 phút:
```
SELECT id FROM bookings WHERE status='PENDING' AND expires_at < now() - GRACE LIMIT 100
for each:
  // QUAN TRỌNG: hỏi provider trước khi huỷ
  for payment in active payments of booking:
      state = provider.get(payment)
      if state in (requires_capture, succeeded, processing): applyProviderState(...); skip cancel
      else: provider.cancel(payment)
  BEGIN; lock booking; if still PENDING → CANCELLED, nhả inventory, nhả lượt discount; COMMIT
```
- **Grace period** (wen-go: 2 phút): khách bấm trả ở giây cuối, 3DS mất 30s, webhook mất thêm vài giây → nếu huỷ đúng phút 15:00 thì sẽ huỷ đơn của người vừa trả tiền.
- Nhiều instance backend chạy cùng scheduler → dùng `SELECT ... FOR UPDATE SKIP LOCKED` hoặc distributed lock (ShedLock, Redis) để không xử lý trùng.

### Bước 9 — Hoàn tiền, đối soát, payout → mục 13, 14

---

## 8. Webhook đi sâu

### 8.1. Webhook là gì và tại sao nó khó

Provider gọi HTTP POST vào endpoint public của bạn khi có sự kiện. Các đặc tính **phải** thiết kế cho:
- **At-least-once**: có thể nhận trùng, nhiều lần.
- **Không đảm bảo thứ tự**.
- **Có thể trễ** (vài giây tới vài giờ khi provider gặp sự cố) hoặc **không bao giờ tới** (bạn tắt endpoint quá lâu, cấu hình sai URL).
- **Retry khi bạn không trả 2xx**: Stripe retry với backoff tăng dần trong tối đa 3 ngày ở live mode.
- **Ai cũng gọi được URL đó** → phải xác thực.

### 8.2. Pipeline xử lý webhook

```
POST /webhooks/stripe
 │
 ├─ 1. Đọc RAW body (bytes), KHÔNG parse JSON trước
 │      (parse rồi serialize lại sẽ đổi thứ tự key/khoảng trắng → chữ ký sai)
 │
 ├─ 2. Xác thực chữ ký ──fail──▶ 400, log cảnh báo, KHÔNG xử lý
 │
 ├─ 3. Parse event; chỉ nhận các event_type mình quan tâm (còn lại → 200, ignore)
 │
 ├─ 4. INSERT payment_webhook_events ON CONFLICT (provider, event_id) DO NOTHING
 │      └─ đã tồn tại và PROCESSED → 200 ngay (event trùng)
 │
 ├─ 5. Xử lý (đồng bộ nếu nhanh; hoặc đẩy vào queue rồi trả 200)
 │      a. Tìm payment theo provider_payment_id (fallback: metadata.payment_id)
 │         không thấy → lưu lại, đánh dấu FAILED/ORPHAN, cảnh báo, vẫn 200
 │      b. (Tuỳ chọn, an toàn hơn) gọi provider lấy trạng thái MỚI NHẤT của object
 │         thay vì tin payload — giải quyết luôn chuyện sai thứ tự
 │      c. Kiểm tra amount, currency, metadata.booking_id khớp DB
 │      d. BEGIN; lock booking + payment; transition theo state machine;
 │         side effects (inventory, ledger, outbox); COMMIT
 │      e. Đánh dấu event PROCESSED
 │
 └─ 6. Trả 2xx nhanh (Stripe timeout khoảng 10–20s)
        Lỗi tạm thời (DB down, deadlock) → trả 5xx để provider retry
        Lỗi vĩnh viễn (dữ liệu sai) → trả 200 + lưu FAILED + cảnh báo (retry cũng vô ích)
```

### 8.3. Xác thực chữ ký Stripe

Header: `Stripe-Signature: t=1729850000,v1=5257a869e7ec...`

```
signed_payload = t + "." + raw_body
expected = HMAC_SHA256(key = whsec_..., message = signed_payload) → hex
hợp lệ nếu:
  constant_time_equals(expected, v1)        // so sánh thời gian hằng, tránh timing attack
  AND |now - t| <= 300 giây                 // chống replay: kẻ gian bắt được request cũ, gửi lại
```
Dùng hàm có sẵn của SDK (`Webhook.constructEvent` / `stripe.webhooks.constructEvent`), đừng tự viết lại.

Event Stripe cần nghe (manual capture):
| Event | Xử lý |
|---|---|
| `payment_intent.amount_capturable_updated` | Đã giữ tiền → re-check → capture/cancel |
| `payment_intent.succeeded` | Chốt đơn |
| `payment_intent.payment_failed` | Ghi lỗi; booking vẫn PENDING (khách có thể thử thẻ khác tới khi hết hạn) |
| `payment_intent.canceled` | Payment CANCELED; nếu booking không còn payment nào đang chạy và đã hết hạn → huỷ |
| `payment_intent.requires_action` | (thông tin) chờ 3DS |
| `charge.refunded` / `refund.updated` | Cập nhật refunds |
| `charge.dispute.created` / `.closed` | Chargeback |
| `setup_intent.succeeded`, `payment_method.attached/detached` | Thẻ đã lưu |

### 8.4. Xác thực webhook SePay

SePay không ký HMAC như Stripe; cấu hình phổ biến là header `Authorization: Apikey <API_KEY>` (kiểm tra lại docs SePay hiện hành). Nên làm thêm:
- So sánh API key bằng constant-time.
- **IP allowlist** các IP của SePay (nếu họ công bố).
- **Không tin hoàn toàn** webhook: với số tiền lớn, có thể gọi API SePay (`/transactions/details/{id}`) để xác nhận giao dịch có thật.
- Chỉ xử lý `transferType = "in"` và đúng `accountNumber` của mình.
- Dedupe theo `id` giao dịch.
- Trả `200` kèm body SePay yêu cầu (vd. `{"success": true}`), nếu không SePay sẽ gửi lại.

Logic ghép giao dịch:
```
code = regex_find(/WG[A-Z0-9]{6,10}/, upper(remove_accents(content)))
if !code → bank_transactions UNMATCHED → hàng đợi thủ công
payment = find payments where provider='SEPAY' and provider_payment_id = code
if !payment → UNMATCHED
if payment đã SUCCEEDED → DUPLICATE (khách chuyển 2 lần) → tạo refund MANUAL_REQUIRED
if booking đã CANCELLED/hết hạn → LATE → thử giữ lại phòng, không được thì hoàn
if amount < payment.amount → AMOUNT_MISMATCH (thiếu) → cộng dồn amount_received; chờ chuyển thêm / liên hệ khách
if amount > payment.amount → chốt đơn + refund phần thừa (MANUAL_REQUIRED)
if amount == payment.amount → SUCCEEDED → chốt đơn
```

### 8.5. Redirect gateway (VNPay) — IPN

- Verify `vnp_SecureHash` = HMAC-SHA512(secret, các tham số `vnp_*` **sắp xếp theo tên**, URL-encoded đúng chuẩn của VNPay).
- Kiểm tra `vnp_TxnRef` tồn tại, `vnp_Amount` (VNPay nhân 100!) khớp, đơn chưa xử lý.
- Trả đúng format VNPay yêu cầu (`{"RspCode":"00","Message":"Confirm Success"}`), có mã riêng cho "đơn đã xác nhận", "sai số tiền"... VNPay dựa vào đó để retry.

---

## 9. Idempotency key: đi sâu

### 9.1. Vấn đề: "không biết" là kết quả thứ ba

Một request qua mạng không chỉ có 2 kết quả. Có tới **3**:

| Kết quả | Ví dụ | Nên làm gì |
|---|---|---|
| Thành công | 201 + body | Dùng kết quả |
| Thất bại rõ ràng | 400 "booking đã hết hạn" | Báo lỗi, không retry |
| **Không biết** | Timeout, mất kết nối giữa chừng, server sập *sau khi đã xử lý* nhưng *trước khi kịp trả response* | Chỉ có một lựa chọn an toàn: **retry** |

Rắc rối nằm ở đây: retry một thao tác **tạo ra tiền** (tạo intent, capture, refund) có thể khiến nó chạy **2 lần**. Idempotency key giải quyết bằng cách cho server nhận ra "request này tôi đã làm rồi", rồi **trả lại kết quả cũ** thay vì làm lại.

```
Không có key:
  Client ── POST /pay ─────────▶ Server: tạo intent #1 ✓ ──✕ response bị mất
  Client ── retry ─────────────▶ Server: tạo intent #2     ❌ khách có thể trả 2 lần

Có key:
  Client ── POST /pay  K=7c9e ─▶ Server: ghi K → tạo intent #1 → lưu response ──✕ mất
  Client ── retry      K=7c9e ─▶ Server: "K đã xong" → trả lại response của intent #1 ✅
```

> Định nghĩa: một thao tác là **idempotent** nếu thực hiện 1 lần hay N lần đều để lại **cùng một trạng thái** và trả về **cùng một kết quả**. GET, PUT, DELETE vốn idempotent theo thiết kế HTTP. POST thì không, nên POST mới cần key.

### 9.2. Bốn tầng chống trùng: đừng nhầm lẫn

"Idempotency" trong một hệ thống thanh toán thực ra là **4 cơ chế khác nhau**, chống 4 loại trùng lặp khác nhau:

| Tầng | Chiều | Ai sinh "khoá" | Ai lưu & chống trùng | Chống cái gì |
|---|---|---|---|---|
| **A** | Client → Backend | FE sinh UUID | **Backend** (bảng `idempotency_keys`) | Double-click, client retry do mạng, mở lại trang giữa chừng |
| **B** | Backend → Stripe | Backend, suy ra từ ID nội bộ | **Stripe** (giữ ≥ 24h) | Timeout khi gọi Stripe, worker retry, process crash rồi chạy lại |
| **C** | Stripe → Backend (webhook) | Có sẵn: `event.id` | **Backend** (`UNIQUE(provider, event_id)`) | Webhook gửi lại (mục 8) |
| **D** | Nghiệp vụ, **không cần key** | — | **DB constraint + state machine** | Hai request *khác key* nhưng cùng ý định: 2 tab, 2 thiết bị |

Câu quan trọng nhất: **tầng A chỉ chống trùng trong cùng một lần thử.** Hai tab sinh ra hai key khác nhau, nên tầng A không chặn được. Cần tầng D (`partial unique index` "1 payment đang chạy / booking", mục 6.3). Ngược lại, tầng D không phân biệt được "khách double-click hoàn tiền 100k" với "admin cố ý hoàn 2 lần 100k" (cả hai đều hợp lệ về mặt dữ liệu). Chỉ key mới phân biệt được. → **Cần cả hai.**

```
          (A) Idempotency-Key             (B) idempotencyKey
 Browser ───────────────────▶ Backend ───────────────────▶ Stripe
                                 ▲  │                         │
                                 │  │ (D) unique index,       │
                                 │  ▼     state machine       │
                                 │  DB                        │
                                 └──────── (C) event.id ──────┘
                                           webhook
```

### 9.3. Ai sinh key, sinh lúc nào

**Nguyên tắc:** key đại diện cho **một ý định** ("trả booking #123, lần thử này"), **không** đại diện cho một request.

**Ở FE (tầng A):**
- Sinh `crypto.randomUUID()` **khi bắt đầu một lần thử thanh toán** (vào màn thanh toán, hoặc khi khách chọn thử lại bằng thẻ khác). Giữ key trong state. Mọi double-click và retry đều **dùng lại** key đó.
- Sinh key mới khi **ý định đổi**: đổi phương thức, đổi thẻ sau khi thẻ cũ bị từ chối, hoặc lần trước đã kết thúc rõ ràng và khách chủ động thử lại.
- ❌ Sai lầm phổ biến nhất: sinh key **trong onClick**. Mỗi lần bấm ra một key, double-click ra hai key khác nhau, và key mất hoàn toàn tác dụng.

```tsx
// ❌ Sai: mỗi lần bấm một key
const pay = () => api.post(url, body, { headers: { "Idempotency-Key": crypto.randomUUID() } });

// ✅ Đúng: một key cho một lần thử
const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID());
const pay = () => api.post(url, body, { headers: { "Idempotency-Key": attemptKey } });
// thẻ bị từ chối, khách chọn thẻ khác → lần thử MỚI → key mới
const tryAnotherCard = () => setAttemptKey(crypto.randomUUID());
```

**Ở backend khi gọi Stripe (tầng B):**
- Key phải **tất định** (deterministic): suy ra từ ID nội bộ đã lưu trong DB, ví dụ `pay_{payment.public_id}`, `cap_{payment.public_id}`, `void_{payment.public_id}`, `ref_{refund.public_id}`. Dù retry ở process nào, sau khi restart hay từ worker khác, key vẫn giống hệt.
- ❌ Đừng sinh UUID ngẫu nhiên mới mỗi lần gọi Stripe. Nếu process crash rồi chạy lại, key mới sẽ tạo ra intent mới.
- **Mỗi thao tác một prefix.** Dùng cùng key cho create và capture thì Stripe báo lỗi, vì cùng key nhưng khác endpoint/tham số.
- Đây là lý do mục 7, bước 2 bắt buộc **INSERT payments trước** rồi mới gọi Stripe: phải có `public_id` thì mới có key tất định.

### 9.4. Bảng `idempotency_keys` (tầng A)

```sql
CREATE TABLE idempotency_keys (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT       NOT NULL,
  endpoint        VARCHAR(100) NOT NULL,   -- 'POST /payment/create-payment-intent'
  idem_key        VARCHAR(100) NOT NULL,   -- giá trị header Idempotency-Key
  request_hash    CHAR(64)     NOT NULL,   -- SHA-256 của body đã chuẩn hoá
  status          VARCHAR(12)  NOT NULL,   -- IN_PROGRESS / COMPLETED
  response_status INT,
  response_body   JSONB,
  locked_until    TIMESTAMPTZ,             -- quá mốc này mà vẫn IN_PROGRESS = request trước đã chết
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ  NOT NULL,   -- now() + 24h, job dọn định kỳ
  UNIQUE (user_id, endpoint, idem_key)
);
CREATE INDEX idx_idem_expires ON idempotency_keys (expires_at);
```

| Field | Tại sao |
|---|---|
| `UNIQUE (user_id, endpoint, idem_key)` | **Scope** theo user và endpoint. Key của user A không đụng user B. Kẻ gian đoán được key của người khác cũng không lấy được response của họ |
| `request_hash` | Chặn dùng lại key với body khác (bug FE hoặc cố ý). Không có field này thì request "cùng key, khác số tiền" vẫn nhận response cũ và bug bị che mất |
| `status` + `locked_until` | Phân biệt "đang xử lý" với "đã xong". Nếu request đầu crash giữa chừng thì sau `locked_until`, request sau được phép tiếp quản thay vì kẹt mãi |
| `response_status` / `response_body` | Để trả lại **y nguyên** cho các lần retry |
| `expires_at` | Không để bảng phình vô hạn. 24h là đủ cho mọi lần retry hợp lý |

### 9.5. Thuật toán xử lý (middleware)

```
handle(req):
  key  = req.headers["Idempotency-Key"]
  if !key: return 400          // bắt buộc với endpoint tạo/di chuyển tiền
  hash = sha256(canonicalJson(req.body))

  # 1) Giành quyền xử lý: INSERT nguyên tử, ai insert được thì người đó xử lý
  inserted = INSERT INTO idempotency_keys
               (user_id, endpoint, idem_key, request_hash, status, locked_until, expires_at)
             VALUES (?, ?, ?, ?, 'IN_PROGRESS', now() + 30s, now() + 24h)
             ON CONFLICT (user_id, endpoint, idem_key) DO NOTHING
             RETURNING id
  if inserted: goto PROCESS

  # 2) Key đã tồn tại
  row = SELECT ... WHERE (user_id, endpoint, idem_key) = (...) FOR UPDATE
  if row.request_hash != hash:      return 422  "Key đã được dùng cho một request khác"
  if row.status == 'COMPLETED':     return row.response   (+ header Idempotent-Replayed: true)
  if row.locked_until > now():      return 409  "Đang xử lý" (+ Retry-After: 1)
  # request trước đã chết giữa chừng → tiếp quản
  UPDATE ... SET locked_until = now() + 30s
  goto PROCESS

PROCESS:
  try:
    resp = businessLogic(req)       # bản thân nó cũng phải an toàn khi chạy lại (tầng B, D)
    if resp.status < 500:
      UPDATE ... SET status='COMPLETED', response_status=resp.status, response_body=resp.body
    else:
      DELETE row                    # 5xx = "không biết" → cho phép retry
    return resp
  catch e:
    DELETE row
    throw e
```

Những điểm dễ sai:
- **Lưu response 2xx và 4xx, KHÔNG lưu 5xx.** 4xx (hết hạn, không có quyền, validate sai) là kết quả xác định: retry cũng ra đúng như vậy. 5xx và timeout là "không biết", nên phải cho client thử lại. Lưu cả 5xx thì client bị kẹt vĩnh viễn với một lỗi tạm thời.
- **Tầng A không đủ một mình.** Giả sử request đầu đã gọi Stripe thành công rồi crash *trước khi* ghi COMPLETED. Request tiếp quản sẽ chạy lại `businessLogic`. Lúc đó **tầng B** (key tất định gửi Stripe, Stripe trả lại intent cũ) và **tầng D** (booking đã có payment đang chạy, trả lại payment đó) mới cứu được.
- Nếu được, ghi `COMPLETED` **trong cùng transaction** với thay đổi nghiệp vụ trong DB. Như vậy không có khoảng hở "đã làm xong nhưng chưa đánh dấu".
- Redis (`SET key NX EX 86400`) nhanh hơn, nhưng Redis có thể mất dữ liệu khi restart hoặc failover. Với tiền thì nên dùng DB, hoặc dùng Redis nhưng phải có tầng D thật chắc chắn.
- Endpoint **chỉ đọc** (GET booking, `POST /payments/{id}/sync`) không cần key: chúng vốn đã idempotent nhờ state machine.

### 9.6. Bảng mã trả về

| Tình huống | Server trả | Client làm gì |
|---|---|---|
| Lần đầu, xử lý xong | `201` | Dùng kết quả |
| Retry, request trước đã xong | `201` cũ y nguyên + `Idempotent-Replayed: true` | Dùng như bình thường |
| Retry trong lúc request trước còn đang chạy | `409` + `Retry-After: 1` | Đợi rồi gửi lại **cùng key** |
| Cùng key nhưng body khác | `422` | Đây là bug: ý định mới thì phải sinh key mới |
| Thiếu key ở endpoint bắt buộc | `400` | Thêm header |
| Request trước lỗi `5xx` | (row đã bị xoá) xử lý như lần đầu | — |

### 9.7. Idempotency key của Stripe (tầng B): những điều cần biết

Tóm tắt theo tài liệu của Stripe, nên đọc lại docs hiện hành trước khi code:
- Truyền qua header `Idempotency-Key` (SDK: option `idempotencyKey`). Dùng cho các request POST. Key dài tối đa 255 ký tự.
- Stripe lưu **kết quả của lần gọi đầu tiên đã bắt đầu thực thi**, kể cả khi đó là lỗi. Gọi lại cùng key sẽ nhận lại đúng kết quả đó.
- Cùng key nhưng **tham số khác** thì Stripe báo lỗi `idempotency_error`. Đây là lý do mỗi thao tác cần một prefix riêng.
- Hai request cùng key **chạy đồng thời** thì request sau bị từ chối và không được lưu. Thử lại sau một chút.
- Key bị xoá sau **ít nhất 24 giờ**. Retry sau mốc đó coi như request mới. Vì vậy job dọn dẹp chạy sau thời gian dài **không được retry mù quáng**: phải tìm trước theo `metadata.payment_id` bằng Stripe Search (mục 7, bước 2).

### 9.8. Những lỗi hay gặp

| Lỗi | Hậu quả |
|---|---|
| Sinh key trong onClick | Double-click ra 2 key khác nhau, key vô dụng |
| UUID ngẫu nhiên mỗi lần gọi Stripe | Crash rồi retry tạo intent mới |
| Chỉ dựa vào disable nút ở FE | JS chậm, F5, gọi API trực tiếp đều vượt qua được |
| Lưu cả response 5xx | Client kẹt vĩnh viễn với lỗi tạm thời |
| Không scope theo user | Rò rỉ response của người khác, hoặc user A vô tình chặn request của user B |
| Không so `request_hash` | Cùng key mà khác body vẫn nhận response cũ, che mất bug |
| Chỉ có tầng A, thiếu tầng D | Mở 2 tab vẫn tạo được 2 payment |
| Một key dùng cho cả create và capture | Stripe báo `idempotency_error` |
| Dùng key cho GET | Thừa, vì GET vốn đã idempotent |

### 9.9. Áp vào wen-go (gợi ý)

- **FE, trang thanh toán** ([PaymentForm.tsx](../src/app/checkout/payment/_components/PaymentForm.tsx), [useBookingPayment.ts](../src/app/checkout/payment/_hooks/useBookingPayment.ts)): sinh `attemptKey` khi vào trang và gửi header `Idempotency-Key` cho `POST /payment/create-payment-intent`. Sinh key mới khi khách đổi thẻ sau lỗi hoặc chuyển từ thẻ sang SePay.
- **Backend:** middleware như mục 9.5 cho create-payment-intent và refund. Gọi Stripe với `pay_` / `cap_` / `void_` / `ref_` + `public_id`.
- **Hoàn tiền phía admin/partner:** sinh key khi **mở hộp thoại hoàn tiền**, không phải khi bấm nút xác nhận.
- `POST /payments/{id}/sync` **không cần** key: chỉ đọc trạng thái rồi áp qua state machine.

---

## 10. Các trường hợp xảy ra

| # | Tình huống | Hệ quả nếu không xử lý | Cách xử lý |
|---|---|---|---|
| 1 | **Happy path** thẻ | — | Mục 4.1 |
| 2 | Thẻ bị từ chối (`card_declined`, `insufficient_funds`) | — | Payment FAILED (hoặc giữ PENDING để thử lại cùng intent), booking vẫn PENDING, FE hiện lỗi thân thiện theo `decline_code` |
| 3 | Cần 3DS, khách bỏ giữa chừng | Intent treo `requires_action` | Hết hạn giữ chỗ → scheduler cancel intent + huỷ booking |
| 4 | Khách đóng tab ngay sau khi trả | FE không bao giờ gọi sync | Không sao: webhook vẫn chốt đơn. Khách mở "Đặt phòng của tôi" thấy Completed + nhận email |
| 5 | **Webhook không bao giờ tới** (sai URL, sai secret, endpoint sập 3 ngày) | Khách bị trừ tiền nhưng đơn huỷ | Sync khi FE poll + **cron đối soát** quét payment PENDING/AUTHORIZED quá N phút, hỏi provider |
| 6 | **Webhook trùng** | Gửi 2 email, trừ kho 2 lần, ghi sổ 2 lần | Unique `event_id` + state machine NOOP |
| 7 | **Webhook sai thứ tự** | Trạng thái lùi | State machine chỉ tiến; hoặc luôn fetch trạng thái mới nhất |
| 8 | Gọi tạo intent bị timeout | Tạo 2 intent, khách trả 2 lần | Idempotency key + payment row tạo trước |
| 9 | **Double-click** "Thanh toán" | 2 booking / 2 intent | Disable nút ở FE (phụ) + idempotency key + partial unique index (chính) |
| 10 | **Trả sau khi booking đã hết hạn** (thẻ) | Mất tiền khách | Scheduler hỏi Stripe trước khi huỷ; nếu auth tới sau khi đã huỷ → manual capture nên chỉ cần **void**, không mất tiền ai |
| 11 | **Chuyển khoản sau khi booking đã huỷ** | Tiền nằm trong TK, khách không có phòng | Thử giữ lại phòng (nếu còn) → chốt; không còn → refund MANUAL, báo khách |
| 12 | Chuyển khoản **thiếu / thừa** | — | Mục 8.4 |
| 13 | Chuyển khoản **sai nội dung** | Không ghép được | UNMATCHED → admin ghép tay (có UI tìm theo số tiền + thời gian) |
| 14 | **Trả 2 lần** (thẻ + QR, hoặc QR 2 lần) | — | Chốt cái tới trước, cái sau → refund tự động (thẻ) hoặc MANUAL (QR). Hạn chế bằng cách huỷ intent thẻ khi chuyển sang QR |
| 15 | Webhook tới trong lúc DB sập | Mất event | Trả 5xx → provider retry. Đừng nuốt lỗi rồi trả 200 |
| 16 | Webhook tới **trước** khi bước 2 kịp lưu `provider_payment_id` | Không tìm thấy payment | Fallback tìm theo `metadata.payment_id`; nếu vẫn không thấy → 5xx cho retry sau vài giây |
| 17 | Capture thất bại (auth đã hết hạn, lỗi mạng) | Booking kẹt PROCESSING | Retry capture với idempotency key; hết hạn auth → huỷ booking, báo khách; cảnh báo khi PROCESSING > X phút |
| 18 | **Số tiền webhook ≠ DB** | Khách trả 10k cho phòng 1 triệu (nếu có bug cho client gửi amount) | Không chốt đơn, cảnh báo ngay — đây là dấu hiệu bug hoặc tấn công |
| 19 | Giá thay đổi giữa lúc tạo booking và lúc trả | — | Booking đã chốt `total_amount` snapshot; intent dùng số đó |
| 20 | Discount hết lượt giữa chừng | Áp giảm giá vượt quota | Giữ lượt lúc tạo booking, nhả lại khi huỷ |
| 21 | Khách huỷ booking đã trả | — | Tính số tiền hoàn theo chính sách (huỷ trước 48h hoàn 100%...) → refund |
| 22 | Refund thất bại (thẻ đã đóng) | — | Stripe trả `refund.failed` → MANUAL_REQUIRED, liên hệ khách |
| 23 | **Chargeback** | Mất tiền + phí dispute | Lưu bằng chứng (log, email xác nhận, IP, chính sách đã đồng ý), nộp trong hạn |
| 24 | **Card testing** (bot thử hàng nghìn thẻ ăn cắp) | Phí, bị Stripe khoá tài khoản | Rate limit tạo intent theo user/IP, CAPTCHA, bắt buộc đăng nhập/OTP, bật Radar |
| 25 | Provider sập | Không ai trả được | Hiện thông báo, cho chọn phương thức khác (QR/trả tại khách sạn); circuit breaker |
| 26 | Khách mở 2 tab, trả ở cả 2 | Trả 2 lần | Trả lại cùng intent cho cả 2 tab (bước 2.1) → Stripe chỉ cho confirm thành công một lần |

---

## 11. Concurrency & race conditions

Ba cuộc đua kinh điển:

**A. Webhook vs Scheduler hết hạn**
```
t=15:00.0  Scheduler đọc booking: PENDING, hết hạn → chuẩn bị huỷ
t=15:00.1  Webhook: requires_capture → chuẩn bị capture
```
Giải: cả hai **lock cùng một dòng booking** (`SELECT ... FOR UPDATE`) và **kiểm tra lại trạng thái sau khi có lock**. Scheduler hỏi provider trước khi huỷ. Bên nào tới sau sẽ thấy trạng thái đã đổi và dừng.

**B. Webhook vs Sync (FE poll)**
Cùng lúc chốt một payment. Giải: chung handler + lock + state machine NOOP. Wen-go FE có xử lý "booking chưa chốt vì lượt webhook/cron khác đang giữ lock capture" → retry sync, đúng tinh thần này.

**C. Hai webhook cùng event (trùng) xử lý song song**
Giải: `INSERT ... ON CONFLICT DO NOTHING` trên `event_id` — chỉ một bên insert thành công; hoặc `SELECT ... FOR UPDATE` trên payment.

Nguyên tắc chung:
- **Không giữ lock DB trong khi gọi mạng** (gọi Stripe có thể mất 5s → nghẽn cả hệ thống). Pattern: transaction ngắn ghi ý định → gọi provider ngoài transaction → transaction ngắn ghi kết quả. Idempotency key giúp gọi lại an toàn.
- Optimistic lock (`version`) cho các cập nhật ít xung đột; pessimistic lock (`FOR UPDATE`) cho chuyển trạng thái tiền.
- Thứ tự lock cố định (luôn booking trước rồi tới payment) để tránh deadlock.

---

## 12. Bảo mật

### 12.1. PCI DSS — chuẩn bảo mật dữ liệu thẻ

- Nếu số thẻ **đi qua server của bạn** → bạn phải đạt PCI DSS mức cao (audit, chi phí lớn).
- Dùng Stripe Elements / Checkout / hosted fields → số thẻ đi thẳng tới Stripe → bạn chỉ cần tự đánh giá **SAQ A**.
- Hệ quả: **không bao giờ** tạo `<input>` số thẻ của riêng bạn rồi gửi về backend. Không log request body có dữ liệu thẻ.

### 12.2. Danh sách kiểm tra

| Mối đe doạ | Biện pháp |
|---|---|
| **Sửa số tiền** từ client | Amount chỉ lấy từ DB. Webhook so khớp amount + currency |
| **Giả mạo webhook** | Verify chữ ký HMAC / API key; IP allowlist; endpoint chỉ nhận POST |
| **Replay webhook** | Kiểm tra timestamp (±5 phút) + dedupe `event_id` |
| **IDOR** (xem/trả booking của người khác, dùng thẻ đã lưu của người khác) | Mọi endpoint check `booking.user_id == currentUser`; check `pm` thuộc customer của user; dùng UUID thay vì ID tăng dần |
| **Lộ secret key** | Chỉ ở server, qua env/secret manager; dùng **restricted key** (chỉ quyền cần thiết); rotate định kỳ; scan repo bằng gitleaks |
| **Tin returnUrl** | Không bao giờ chốt đơn từ redirect |
| **Card testing / bot** | Rate limit, CAPTCHA, Radar, bắt buộc OTP với khách vãng lai |
| **Timing attack** khi so chữ ký | So sánh constant-time |
| **Log lộ dữ liệu** | Không log `client_secret`, header Authorization, dữ liệu thẻ; mask email/SĐT |
| **Lỗi lộ thông tin nội bộ** | Trả message chung cho client; chi tiết chỉ ở log |
| **Leo thang đặc quyền** | Endpoint refund/capture thủ công chỉ admin; ghi audit ai bấm; với số tiền lớn có thể cần 2 người duyệt |
| **Transport** | HTTPS toàn bộ, HSTS; webhook endpoint bắt buộc HTTPS |
| **CSRF** | API dùng Bearer token không bị CSRF; nếu dùng cookie session → SameSite + CSRF token. Webhook endpoint loại trừ khỏi CSRF và auth thường, chỉ dùng chữ ký |
| **DB** | User DB của app không có quyền DROP/TRUNCATE; backup có mã hoá; bảng payment chỉ cho phép thêm và cập nhật trạng thái, không xoá |

### 12.3. Stripe `client_secret`

- Cho FE là đúng thiết kế, nhưng nó cho phép **confirm** intent đó → chỉ trả cho đúng chủ booking, qua HTTPS, không đặt vào URL, không log.

---

## 13. Đối soát (reconciliation)

**Mục tiêu:** chứng minh mỗi đồng trong DB khớp với provider và ngân hàng. Không đối soát = không phát hiện được bug "tiền về nhưng đơn huỷ" cho tới khi khách khiếu nại.

Ba tầng:
1. **Gần thời gian thực (mỗi 5–10 phút):** quét payment ở trạng thái chưa kết thúc quá N phút → hỏi provider → `applyProviderState`. Đây là lưới an toàn cho webhook.
2. **Hằng ngày:** tải báo cáo provider (Stripe Balance Transactions / Reports API; SePay danh sách giao dịch) cho ngày hôm qua → so với DB:
   - Có ở provider, không có/khác trạng thái ở DB → **nghiêm trọng** (khách trả mà mình không ghi nhận).
   - Có ở DB SUCCEEDED, không có ở provider → bug hoặc gian lận.
   - Số tiền lệch.
   - Ghi kết quả vào `reconciliation_items`, cảnh báo nếu lệch.
3. **Theo kỳ payout:** tổng payout Stripe chuyển về ngân hàng = tổng giao dịch − phí − refund − dispute. Kế toán làm việc này.

---

## 14. Hoàn tiền, tranh chấp, chi trả cho đối tác

### Refund
```
POST /admin/bookings/{id}/refund {amount?, reason}
- Quyền: admin/owner của khách sạn (theo chính sách)
- amount ≤ payment.amount_received - payment.amount_refunded
- INSERT refunds (PENDING, idempotency_key) → commit
- Thẻ: stripe.refunds.create({payment_intent, amount}, {idempotencyKey})
   → webhook refund.updated/charge.refunded → SUCCEEDED/FAILED
- Chuyển khoản: MANUAL_REQUIRED → kế toán chuyển → nhập mã GD → SUCCEEDED
- booking → REFUND_PENDING → REFUNDED; nhả phòng; ledger đảo bút toán
```
- Nếu payment còn AUTHORIZED (chưa capture) → **cancel** thay vì refund (miễn phí, nhanh).
- Phí giao dịch Stripe thường **không được hoàn** khi refund → tính vào chính sách huỷ.

### Dispute / chargeback
Khách gọi ngân hàng báo "không thực hiện giao dịch này" → ngân hàng **rút tiền lại** từ bạn kèm phí. Bạn có vài ngày để nộp bằng chứng. Lưu sẵn: thời điểm đặt, IP, email xác nhận đã gửi, đồng ý điều khoản, kết quả 3DS (giao dịch có 3DS thường được **chuyển trách nhiệm** sang issuer — liability shift).

### Payout cho khách sạn (marketplace)
Wen-go có module partner → nếu nền tảng thu tiền rồi trả cho khách sạn:
- Cần ledger để biết đang nợ mỗi khách sạn bao nhiêu (sau hoa hồng, phí, refund).
- Lịch chi trả (vd. sau khi khách check-out + N ngày, để còn xử lý refund/dispute).
- Có thể dùng **Stripe Connect** để Stripe tách tiền tự động (destination charges / separate charges and transfers).
- **Pháp lý:** thu hộ tiền cho bên thứ ba có thể cần giấy phép trung gian thanh toán tuỳ quốc gia → tìm hiểu trước khi go-live. Cách tránh: mô hình "trả tại khách sạn" hoặc tiền đi thẳng vào TK khách sạn qua Connect.

---

## 15. Vận hành: log, metric, cảnh báo

**Log có cấu trúc** với các trường: `booking_id`, `payment_id`, `provider_payment_id`, `event_id`, `correlation_id`. Tra một booking là ra toàn bộ hành trình.

**Metric nên có:**
- Tỉ lệ thanh toán thành công / từ chối theo `failure_code`, theo provider
- Độ trễ webhook (từ `created` của event tới lúc xử lý)
- Số webhook verify thất bại (tăng đột biến = bị tấn công hoặc rotate secret sai)
- Số booking kẹt `PROCESSING` > 10 phút, payment `CREATED` > 30 phút
- Số `bank_transactions` UNMATCHED
- Kết quả đối soát hằng ngày

**Cảnh báo bắt buộc:** webhook lỗi liên tục, đối soát lệch, booking kẹt, amount mismatch, refund thất bại.

**Runbook:** viết sẵn "khi webhook sập thì làm gì", "replay event thế nào", "ghép tay giao dịch chuyển khoản thế nào".

---

## 16. Test & môi trường dev

**Stripe:**
```bash
stripe login
stripe listen --forward-to localhost:8080/webhooks/stripe   # in ra whsec_ riêng cho local
stripe trigger payment_intent.succeeded
stripe events resend evt_xxx                                  # test idempotency
```
Thẻ test thường dùng:
| Số thẻ | Kết quả |
|---|---|
| `4242 4242 4242 4242` | Thành công |
| `4000 0025 0000 3155` | Bắt buộc 3DS |
| `4000 0000 0000 9995` | Từ chối — không đủ tiền |
| `4000 0000 0000 0002` | Từ chối — chung |
| `4000 0000 0000 0341` | Gắn vào customer được, nhưng charge bị từ chối |

**SePay:** dùng môi trường sandbox / gửi webhook giả bằng `curl` với đúng header Apikey; expose localhost bằng `ngrok` / `cloudflared tunnel`.

**Kịch bản test bắt buộc** (nên tự động hoá): gửi trùng webhook; gửi sai thứ tự; gửi chữ ký sai; webhook tới khi booking đã hết hạn; chuyển khoản thiếu/thừa/sai nội dung; double-click; 2 tab; timeout khi gọi Stripe (mock); scheduler và webhook cùng lúc; refund một phần rồi toàn phần.

---

## 17. Đặc thù Việt Nam

- **VND không có số lẻ**: Stripe coi VND là zero-decimal (`amount: 150000` = 150.000đ). VNPay lại yêu cầu **nhân 100**. Mỗi provider một quy ước → chuyển đổi ở adapter, đừng rải khắp code.
- **NAPAS 247 / VietQR**: chuẩn QR liên ngân hàng; chuyển khoản tức thì 24/7. Dịch vụ như SePay, Casso, PayOS đọc biến động số dư và bắn webhook.
- **Nội dung chuyển khoản**: một số ngân hàng bỏ dấu, cắt độ dài, thêm tiền tố → mã đối soát ngắn, in hoa, chữ + số, dò bằng regex.
- **Thẻ nội địa (NAPAS)**: Stripe không hỗ trợ thẻ ATM nội địa → cần VNPay/OnePay nếu muốn nhận.
- **Hoá đơn điện tử**: doanh nghiệp phải xuất hoá đơn điện tử theo quy định → event `BOOKING_CONFIRMED` có thể kích hoạt tích hợp với nhà cung cấp hoá đơn (VNPT, Viettel, MISA...).
- **Bảo vệ dữ liệu cá nhân** (Nghị định 13/2023): thu thập tối thiểu, có đồng ý, có quy trình xoá.
- **Pháp lý trung gian thanh toán**: xem mục 14.

---

## 18. Checklist triển khai

**Thiết kế**
- [ ] State machine booking + payment đã viết ra
- [ ] Chọn auto/manual capture, thời gian giữ chỗ, grace period
- [ ] Chính sách huỷ/hoàn rõ ràng, hiển thị cho khách trước khi trả

**Database**
- [ ] `payments` có unique `(provider, provider_payment_id)`, unique `idempotency_key`, partial unique "1 payment đang sống / booking"
- [ ] `payment_webhook_events` unique `(provider, event_id)`, lưu payload thô
- [ ] `refunds`, `bank_transactions` (nếu có QR)
- [ ] Tiền là `BIGINT`, có `currency`

**Backend**
- [ ] Giá tính ở server, snapshot trong booking
- [ ] Giữ chỗ nguyên tử (không oversell)
- [ ] Create intent: check quyền, check trạng thái, tái sử dụng intent cũ, idempotency key
- [ ] Middleware `Idempotency-Key` (mục 9.5): FE sinh key 1 lần cho mỗi lần thử; scope theo user + endpoint; so `request_hash`; lưu 2xx/4xx, không lưu 5xx
- [ ] Key gửi Stripe tất định theo `public_id`, mỗi thao tác một prefix (`pay_`, `cap_`, `void_`, `ref_`)
- [ ] Webhook: raw body, verify chữ ký, dedupe, state machine, so amount, transaction, 2xx/5xx đúng
- [ ] Một handler chung cho webhook / sync / cron
- [ ] Scheduler hết hạn: hỏi provider trước khi huỷ, grace period, chạy được nhiều instance
- [ ] Side effects qua outbox
- [ ] Refund flow + quyền + audit

**Bảo mật**
- [ ] Không chạm số thẻ (Elements)
- [ ] Secret ở env/secret manager, restricted key, không log secret
- [ ] Check ownership mọi endpoint (booking, payment method)
- [ ] Rate limit tạo intent + sync; CAPTCHA/OTP chống card testing

**Vận hành**
- [ ] Cron đối soát ngắn hạn + hằng ngày
- [ ] Metric + cảnh báo (webhook lỗi, booking kẹt, UNMATCHED, lệch đối soát)
- [ ] Runbook replay webhook, ghép tay chuyển khoản
- [ ] Đổi test keys → live keys, đăng ký webhook live với secret mới

---

## 19. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| **PSP** | Payment Service Provider — cổng thanh toán (Stripe, VNPay) |
| **Acquirer / Issuer** | Ngân hàng của người bán / của người mua |
| **Authorization** | Ngân hàng phát hành duyệt và giữ tiền |
| **Capture** | Merchant chốt lấy số tiền đã giữ |
| **Void / Cancel** | Huỷ khoản giữ trước khi capture (miễn phí) |
| **Refund** | Hoàn tiền sau capture |
| **Settlement / Payout** | Tiền thật về PSP / về tài khoản merchant |
| **3DS / SCA** | Xác thực thêm (OTP, app ngân hàng) khi trả bằng thẻ; chuyển trách nhiệm gian lận sang issuer |
| **Chargeback / Dispute** | Khách khiếu nại qua ngân hàng, tiền bị rút lại |
| **Webhook / IPN** | Provider gọi về server của bạn báo sự kiện |
| **Idempotency** | Gọi nhiều lần cho ra cùng kết quả, không có tác dụng phụ lặp lại |
| **Idempotency key** | Mã duy nhất đại diện cho một ý định; server dùng nó để nhận ra request lặp lại và trả lại kết quả cũ (mục 9) |
| **PaymentIntent** | Đối tượng của Stripe đại diện cho một ý định thanh toán, theo suốt vòng đời |
| **client_secret** | Khoá của một PaymentIntent cụ thể, cho FE confirm |
| **PCI DSS / SAQ A** | Chuẩn bảo mật dữ liệu thẻ / mức tự đánh giá thấp nhất khi không chạm số thẻ |
| **Outbox pattern** | Ghi event vào DB cùng transaction, worker gửi đi sau — đảm bảo không mất/không gửi sai |
| **Ledger (double-entry)** | Sổ cái kép, mỗi giao dịch có bên nợ = bên có |
| **Reconciliation** | Đối soát DB với báo cáo của provider/ngân hàng |
| **Zero-decimal currency** | Tiền tệ không có đơn vị lẻ (VND, JPY) |
| **Liability shift** | Chuyển trách nhiệm gian lận từ merchant sang issuer (nhờ 3DS) |
