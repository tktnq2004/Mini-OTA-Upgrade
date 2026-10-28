---
name: responsive-ui
description: Make every frontend UI change in wen-go work on mobile and tablet. Use AUTOMATICALLY, without being asked, right after adding, editing or removing any UI in this repo — a page, component, layout, form, table, modal, sidebar, or any *.module.css / globals.css / JSX that renders something — even for small tweaks. Also use when the user mentions responsive, mobile, tablet, điện thoại, máy tính bảng, màn hình nhỏ, giao diện vỡ, tràn ngang. Skip only for changes that render nothing (pure logic, API clients, tests, backend).
---

# Responsive UI cho wen-go

Mỗi lần thay đổi giao diện frontend (thêm, sửa, xoá UI), tự làm thêm bước này trước khi báo xong — người dùng không cần nhắc. Mục tiêu: giao diện vừa thêm/sửa dùng tốt ở **mobile (360–430px)**, **tablet (768–1024px)** và giữ nguyên desktop đã duyệt.

## Khi nào chạy

- Có file `.tsx` thay đổi phần render, hoặc file `.css` / `.module.css` thay đổi → chạy.
- Xoá UI cũng chạy: bố cục còn lại có thể bị hở/lệch (lưới mất 1 ô, cột trống...).
- Chỉ đổi logic, kiểu dữ liệu, gọi API, test, backend → bỏ qua.
- Chỉ xét phần vừa đụng tới và chỗ bao quanh nó; không tự ý sửa responsive toàn site. Thấy lỗi responsive có sẵn ở chỗ khác thì báo cho người dùng, không sửa lan.

## Thang breakpoint của dự án

Dự án viết desktop trước, thu nhỏ bằng `@media (max-width: …)`. Code mới dùng thang này; file đã có breakpoint riêng thì dùng lại breakpoint gần nhất **trong cùng file** cho nhất quán.

| Breakpoint | Thiết bị | Việc thường làm |
|---|---|---|
| `1080px` | laptop nhỏ, tablet ngang | lưới 4 cột → 3 |
| `860px` | tablet dọc | bố cục 2 cột → xếp dọc; sidebar quản lý → thanh ngang trên cùng; bỏ `position: sticky` của cột phụ |
| `720px` | — | header công khai chuyển sang menu mobile (`SiteHeader`) — đã có, đừng làm lại |
| `640px` | điện thoại | lưới → 1–2 cột; `formGrid` → 1 cột; padding trang 16px; khung chi tiết/modal rộng hết màn |
| `420px` | điện thoại nhỏ | còn 1 cột; nút chính rộng hết hàng; giảm cỡ tiêu đề |

Ưu tiên bố cục **tự co giãn không cần media query**, rồi mới thêm breakpoint:
- 2 cột: `display: flex; flex-wrap: wrap;` + cột chính `flex: 2 1 520px; min-width: 0` và cột phụ `flex: 1 1 300px; min-width: 0` (mẫu `.split` trong `src/app/partner/partner.module.css`, `.columns` trong `RoomForm.module.css`).
- Lưới thẻ: `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`.

## Checklist bắt buộc

Đi qua từng mục cho phần UI vừa đổi:

1. **Không tràn ngang ở 360px.** Không đặt `width` px cố định lớn hơn màn hình; dùng `max-width`, `%`, `minmax()`. Mọi con của flex/grid chứa chữ dài phải có `min-width: 0`.
2. **Bảng:** bọc trong khung `overflow-x: auto` (mẫu `.tableWrap`) và đặt `min-width` cho `<table>`. Bảng chỉ có 2–3 cột quan trọng thì có thể chuyển thành danh sách thẻ ở `≤640px`.
3. **Thanh công cụ, tab, nhóm nút:** `flex-wrap: wrap`, hoặc `overflow-x: auto` (ẩn scrollbar) cho tab dài. Không để nút bị ép méo chữ.
4. **Vùng bấm** cao tối thiểu 40px (khuyến nghị 44px) trên mobile, khoảng cách giữa các nút ≥ 8px. Nút chỉ có icon phải có `aria-label`.
5. **Không phụ thuộc hover.** Thông tin hay menu chỉ hiện khi hover phải có cách bấm để mở trên màn cảm ứng.
6. **Chữ:** không nhỏ hơn 12px; tên, email, địa chỉ dài dùng `overflow-wrap: anywhere` hoặc `text-overflow: ellipsis` (kèm `title` để xem đủ). Tiêu đề lớn giảm cỡ ở `≤640px`.
7. **Ô nhập trên iPhone:** chữ nhỏ hơn 16px làm iOS tự phóng to khi chạm. Ô nhập vừa thêm/sửa đặt `font-size: 16px` ở `≤640px` (`controls.input` hiện là 13.5px).
8. **Ảnh, media:** dùng `aspect-ratio` + `object-fit: cover`, không cố định chiều cao px lớn; ảnh panorama và bản đồ phải co theo bề ngang.
9. **Phần dính, phần cố định:**
   - `position: sticky/fixed` không được che nội dung trên mobile.
   - Cột phụ sticky phải bỏ sticky ở `≤860px`.
   - Thanh dính đáy (vd. thanh lưu) phải chỉnh `margin`/`padding` theo padding mobile của trang.
10. **Chiều cao màn hình:** phần chiếm trọn màn dùng `100dvh` (hoặc `min-height`) thay vì `100vh`, để thanh địa chỉ trình duyệt mobile không cắt nội dung.
11. **Modal, khung chi tiết, popover:** ở `≤640px` rộng hết màn (trừ lề 16px), cuộn được bên trong, nút đóng dễ bấm.
12. **Style inline trong TSX không có media query.** Phần cần đổi theo màn hình thì chuyển sang CSS module.
13. **Theme:** dùng token `--color-*`, `--radius-*`, `--shadow-*` trong `src/app/globals.css`, không dùng màu cứng (trừ lớp phủ trên ảnh), để giao diện tối vẫn đúng. Animation mới thì thêm `@media (prefers-reduced-motion: reduce)`.

## Quy trình

1. **Liệt kê** các file UI vừa đổi (TSX + CSS module đi kèm).
2. **Đọc CSS module** của từng chỗ, đối chiếu checklist, sửa bằng CSS (media query hoặc bố cục tự co giãn). Chỉ dùng JS cho thay đổi cấu trúc thật sự (vd. đổi bảng thành menu). Không thêm thư viện.
3. **Kiểm chứng bằng mắt** nếu chạy được dev server:
   - Không tắt hay khởi động lại server người dùng đang chạy; dùng server đang chạy nếu nó đã có code mới.
   - Chạy script `scripts/responsive-check.cjs` (hướng dẫn ở đầu file). Script chụp 3 khổ: 390×844, 768×1024, 1280×800, và in ra phần tử tràn ngang.
   - Mở xem các ảnh chụp; khổ nào báo "TRÀN NGANG" thì sửa rồi chạy lại.
   - Trang cần đăng nhập (`/admin`, `/partner`, `/account`): dùng `--login`, nhưng chỉ với tài khoản test được người dùng đồng ý. Không có thì ghi rõ trang đó chưa kiểm chứng bằng ảnh.
4. **Kiểm tra code:** `npx tsc --noEmit` và `npx eslint <file đã sửa>`.
5. **Báo cáo** trong câu trả lời, ngắn gọn:
   - Đã chỉnh gì cho mobile/tablet.
   - Đã kiểm chứng ở khổ nào.
   - Chỗ chưa kiểm được, và lỗi responsive có sẵn ở nơi khác (nếu thấy).

## Không làm

- Không đổi giao diện desktop đã được duyệt (mockup, ảnh chụp người dùng đã đồng ý) chỉ để tiện cho mobile. Mobile được phép khác desktop, desktop giữ nguyên.
- Không ẩn bớt thông tin hay chức năng trên mobile để "cho gọn", trừ khi người dùng đồng ý; ưu tiên xếp lại, thu gọn vào menu hoặc khối mở rộng.
- Không thêm thư viện CSS/UI mới, không viết JS đo kích thước màn hình khi CSS làm được.
