# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: khách đặt phòng.** Người Việt (và khách đọc tiếng Anh) tìm, so sánh và đặt phòng khách sạn trong nước trên trang công khai, cả desktop lẫn điện thoại. Khi phải đánh đổi thiết kế, trải nghiệm của nhóm này thắng.

Nhóm phụ, phục vụ nhóm chính:

- **Chủ / nhân viên khách sạn** (`/partner`): quản lý hồ sơ khách sạn, loại phòng, phòng, ảnh và panorama, giảm giá, xem booking của khách sạn mình. Nhân viên và chủ khác nhau hoàn toàn theo permission; không có giao diện riêng cho từng vai trò.
- **Admin hệ thống** (`/admin`): CRUD toàn bộ khách sạn, người dùng, vai trò/quyền, danh mục tiện nghi và view, giảm giá; biên tập hotspot cho tour 360°.

## Product Purpose

Trạm OTA là frontend đặt phòng khách sạn khắp Việt Nam (Next.js), nói chuyện với backend Spring Boot Mini-OTA qua các route proxy. Khách tìm theo tỉnh/xã hoặc trên bản đồ, xem trước khách sạn và phòng bằng tour 360°, rồi đặt và thanh toán.

Đây là **đồ án / sản phẩm portfolio**, chưa chạy thương mại: dữ liệu khách sạn là seed/test. Thành công nghĩa là luồng tìm → xem → đặt → trả tiền chạy thật, đúng, an toàn từ đầu đến cuối và thuyết phục khi trình diễn.

## Positioning

Ba điều sản phẩm làm mà một trang đặt phòng thông thường không làm, đã được xác nhận:

1. **Xem trước phòng 360°**: tour panorama của khách sạn và từng phòng, đi qua các hotspot, trước khi đặt.
2. **Tìm trên bản đồ**: trang `/map` tìm khách sạn theo vị trí.
3. **Đặt không cần tài khoản**: khách vãng lai xác thực OTP qua email rồi đặt luôn, không phải đăng ký.

## Operating Context

- Song ngữ **vi** (mặc định, `lang="vi"`) và **en**, qua `LanguageProvider` + từ điển trong `src/components/i18n/dictionaries/`. Mọi chữ hiển thị đi qua từ điển.
- Có giao diện sáng/tối (`ThemeProvider`, đặt `data-theme` trước khi hydrate).
- Tiền tệ VND; địa điểm theo danh mục tỉnh/xã Việt Nam (`src/data/locations.data`).
- Luồng đặt: tìm kiếm → danh sách / bản đồ → chi tiết khách sạn → chi tiết phòng → `/checkout` → `/checkout/payment`. Khách đăng nhập có `/account` (booking, phương thức thanh toán) và `/wishlist`.
- Cổng quản lý: `/admin` và `/partner` dùng chung một trang đăng nhập; tài khoản được đưa về đúng cổng theo khách sạn của họ. Editor tour 360° (`/admin/tour/[id]`) là trang toàn màn hình, mở ở tab riêng.

## Capabilities and Constraints

- **Thanh toán:** thẻ qua Stripe và chuyển khoản QR qua SePay. Ví MoMo có trong giao diện nhưng tắt (`FEATURES.momoPayment`), vì backend chưa có cổng MoMo.
- **Tour 360°:** panorama được upload ở trang quản lý khách sạn/phòng; editor chỉ gắn hotspot, đổi tên vi/en, chọn panorama bắt đầu. Hotspot chỉ nối trong cùng một khách sạn. Viewer "Xem 360°" phía khách hiện vẫn dùng dữ liệu mock.
- **Bản đồ:** MapLibre + MapTiler.
- **Khách vãng lai:** OTP email trước khi tạo booking → tài khoản GUEST có token; lịch sử booking chỉ lấy theo token, không nhận email từ URL. Phía frontend đã làm, phía backend chưa.
- **Loại phòng thuộc từng khách sạn** (sức chứa, chính sách hút thuốc/thú cưng/huỷ, tiện nghi, view). Tiện nghi và view là danh mục chung do admin quản lý.
- **Giảm giá theo khách sạn**, gắn với phòng. Chưa làm: tag giảm giá công khai, chốt giá lúc đặt, payableAmount.
- **Cờ tính năng** (`src/lib/features.ts`) giấu phần giao diện mà backend chưa hỗ trợ: băng chuyền mã ưu đãi, form nhận tin + tải app, MoMo.
- Chưa làm: quản lý nhân viên/vai trò theo khách sạn cho chủ ("Sắp có" trên `/partner`).
- Mọi lời gọi từ trình duyệt đi qua proxy `/api/public`, `/api/account`, `/api/admin`; token nằm trong cookie httpOnly.

## Brand Commitments

- Tên công khai: **Trạm OTA** (logo chữ "TrạmOTA"). "wen-go" và "Mini-OTA" là tên repo/backend, không hiển thị cho khách.
- Giọng văn hướng tới người Việt, tiếng Việt có dấu đầy đủ là ngôn ngữ chính.

## Evidence on Hand

- Số liệu thật lấy từ API: tổng số khách sạn, số tỉnh có khách sạn (dải tin cậy ở trang chủ), đánh giá của khách (rating + bình luận lưu trong backend).
- Ảnh mẫu phòng/khách sạn trong `public/hotel/`, `public/resort/`; ảnh khách sạn seed và panorama lưu trên R2.
- **Không có:** khách hàng thật, đối tác khách sạn thật, báo chí, giải thưởng, số liệu tăng trưởng, testimonial ngoài đánh giá trong DB, app trên store. Không được bịa ra các thứ này. Đây là đồ án, dữ liệu là seed.

## Product Principles

1. **Khách đặt phòng là trên hết.** Cổng quản lý tồn tại để dữ liệu phía khách đúng và đủ.
2. **Không có nội dung giả.** Thứ backend chưa làm được thì giấu sau cờ tính năng, không giả vờ là nó chạy. Số liệu, đánh giá, ưu đãi phải đến từ API.
3. **Cho thấy phòng trước khi đòi tiền.** Tour 360° và vị trí trên bản đồ là lý do để chọn Trạm OTA; chúng phải dễ tìm trên đường đi tới nút đặt.
4. **Đặt nhanh, ít rào cản, nhưng an toàn.** Không bắt đăng ký; xác thực bằng OTP và token, không bao giờ bằng mã đơn hoặc email trên URL.
5. **Song ngữ ngang nhau.** Tiếng Việt mặc định, tiếng Anh đầy đủ; không có chữ cứng trong code.
