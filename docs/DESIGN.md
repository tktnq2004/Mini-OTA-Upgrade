---
name: Trạm OTA
description: Đặt phòng khách sạn khắp Việt Nam — gọn, dày thông tin, một màu tín hiệu duy nhất.
colors:
  map-pin-blue: "#2563eb"
  map-pin-blue-deep: "#1d4ed8"
  map-pin-blue-wash: "rgba(37, 99, 235, 0.08)"
  on-accent: "#ffffff"
  platform-white: "#ffffff"
  concourse-gray: "#f6f7f8"
  panel-raised: "#f2f3f5"
  inset: "#f7f8f9"
  rail-line: "#e3e5e8"
  rail-line-soft: "#ebedf0"
  departure-ink: "#16181d"
  ink-muted: "#565d6a"
  ink-faint: "#6b7280"
  signal-red: "#dc2626"
  signal-red-wash: "rgba(220, 38, 38, 0.08)"
  clear-green: "#16a34a"
  clear-green-wash: "rgba(22, 163, 74, 0.1)"
  caution-amber: "#b45309"
  rating-star: "#f5a524"
  night-bg: "#0f1115"
  night-panel: "#16181d"
  night-panel-raised: "#1c1f26"
  night-inset: "#1a1d23"
  night-rail-line: "#272b33"
  night-ink: "#f2f3f5"
  night-ink-muted: "#9aa1ab"
  night-ink-faint: "#80878f"
  night-map-pin-blue: "#3b82f6"
  night-map-pin-blue-strong: "#60a5fa"
typography:
  brand:
    fontFamily: "Nunito, Inter, system-ui, sans-serif"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
  display:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "clamp(1.7rem, 3.4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "clamp(1.15rem, 1.9vw, 1.45rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  body-lead:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  eyebrow:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "20": "20px"
components:
  button-primary:
    backgroundColor: "{colors.map-pin-blue}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.map-pin-blue-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.departure-ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.panel-raised}"
  input:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.departure-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "38px"
  card:
    backgroundColor: "{colors.platform-white}"
    rounded: "{rounded.md}"
  chip:
    backgroundColor: "{colors.platform-white}"
    textColor: "{colors.departure-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-selected:
    backgroundColor: "{colors.map-pin-blue-wash}"
    textColor: "{colors.map-pin-blue}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  nav-link-active:
    backgroundColor: "{colors.map-pin-blue-wash}"
    textColor: "{colors.map-pin-blue}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
  discount-tag:
    backgroundColor: "{colors.signal-red-wash}"
    textColor: "{colors.signal-red}"
    rounded: "{rounded.pill}"
    padding: "2px 8px 2px 2px"
---

# Design System: Trạm OTA

## Overview

**Creative North Star: "Bảng giờ nhà ga"**

"Trạm" là nhà ga. Bảng giờ ở nhà ga chứa rất nhiều thông tin nhưng ai đi qua cũng đọc được trong vài giây: chữ gọn, hàng thẳng, nền trung tính, và chỉ có một màu tín hiệu để chỉ đường. Trạm OTA giữ đúng tinh thần đó. Giao diện dày thông tin (chữ thân 13.5px, khoảng cách 6–12px), xếp hàng ngay ngắn, không trang trí. Màu xanh ghim bản đồ là tín hiệu duy nhất. Nó đánh dấu chỗ để bấm, mục đang chọn và vị trí focus, không bao giờ chỉ để trang trí.

Bề mặt phẳng, phân lớp bằng viền mảnh và sắc độ nền, không bằng bóng. Đổ bóng chỉ xuất hiện khi có việc: thẻ đang được hover, popup nổi lên trên nội dung. Theme sáng và tối dùng chung bố cục và khoảng cách, chỉ đảo bộ token màu. Nét cá tính nằm ở các chi tiết chính xác (căn thẳng, số liệu đúng, trạng thái rõ), không ở hiệu ứng.

Trang khách và cổng quản lý (`/partner`, `/admin`) dùng chung một hệ thống. Trang khách được phép có thêm nhịp thở ở hero (lưới chấm gợi bản đồ, quầng xanh nhạt, chữ hiện so le khi mở trang). Trang quản lý thì thuần công cụ: sidebar, bảng, form.

**Key Characteristics:**
- Một màu nhấn (xanh ghim bản đồ) trên nền trung tính lạnh.
- Mật độ cao: chữ 12–13.5px cho giao diện, 15px cho đoạn dẫn, tiêu đề lớn dùng `clamp()`.
- Phẳng theo mặc định; viền 1px + sắc độ nền tạo tầng lớp.
- Bo góc nhỏ và nhất quán (6/10/14px), dạng viên thuốc cho chip và tag.
- Sáng/tối song song, mọi màu đi qua token.
- Chuyển động ngắn (0.15s ease), có tôn trọng `prefers-reduced-motion`.

## Colors

Nền trung tính lạnh gần như trắng/đen, chữ đậm tương phản cao, và một màu xanh duy nhất làm tín hiệu. Trạng thái (lỗi, thành công, cảnh báo) dùng màu đặc cho chữ, nền "wash" trong suốt cho mảng.

### Primary
- **Xanh ghim bản đồ** (`map-pin-blue`): nút chính, link hành động, mục điều hướng đang chọn, chip đang chọn, viền và vòng focus, icon nhấn trong eyebrow/hero. Ở theme tối là `night-map-pin-blue`.
- **Xanh ghim đậm** (`map-pin-blue-deep`): trạng thái hover của nút chính. Ở theme tối đảo thành sáng hơn (`night-map-pin-blue-strong`) để hover vẫn nổi trên nền tối.
- **Nước xanh** (`map-pin-blue-wash`): nền của mục đang chọn (nav, chip, tone "info"), vòng focus 3px của ô nhập, quầng sáng ở hero.

### Neutral
- **Trắng sân ga** (`platform-white`): nền trang công khai và nền mọi panel/thẻ.
- **Xám sảnh chờ** (`concourse-gray`): nền phía sau của cổng quản lý (`bg-alt`), để panel trắng nổi lên mà không cần bóng.
- **Panel nổi** (`panel-raised`): hàng tiêu đề bảng, nền hover của nút ghost và nút icon.
- **Lõm** (`inset`): nền ô nhập, nền ảnh đang tải hoặc ảnh lỗi, chip trung tính.
- **Vạch ray** (`rail-line`): viền 1px của panel, thẻ, ô nhập, header. **Vạch ray nhạt** (`rail-line-soft`): đường kẻ giữa các hàng bảng, vạch phân cách bên trong.
- **Mực bảng giờ** (`departure-ink`): chữ chính.
- **Mực mờ** (`ink-muted`): chữ phụ, nhãn form, link nav chưa chọn, địa chỉ.
- **Mực nhạt** (`ink-faint`): placeholder, icon phụ, viền khi hover. Đã chỉnh để đạt WCAG AA (≥ 4.5:1) trên mọi nền sáng.
- Theme tối có bộ `night-*` tương ứng, khai báo dưới `:root[data-theme="dark"]` trong `src/app/globals.css`.

### Status
- **Đỏ tín hiệu** (`signal-red`) + `signal-red-wash`: lỗi, nút xoá, tone "danger", và **tag giảm giá**. Quy ước "giảm giá = đỏ" là quen thuộc với khách Việt.
- **Xanh thông tuyến** (`clear-green`) + `clear-green-wash`: thành công, tone "success".
- **Hổ phách cảnh báo** (`caution-amber`): tone "warning" ở `/partner` và editor tour. Theme tối dùng `#fdba74` trên nền `rgba(251, 146, 60, 0.16)`. Hiện đang viết cứng trong 3 file, chưa thành token.
- **Vàng sao** (`rating-star`): chỉ dùng cho sao đánh giá.

### Named Rules
**The One Signal Rule.** Xanh ghim bản đồ là màu tín hiệu duy nhất. Nó chỉ đánh dấu thứ bấm được, thứ đang chọn hoặc thứ đang focus. Không dùng làm nền mảng lớn hay trang trí.

**The Token-Only Rule.** Mọi màu đi qua biến CSS `--color-*` để theme tối tự đổi. Ngoại lệ duy nhất là chữ trắng hoặc nền đặc đè lên ảnh (tag giảm giá trên ảnh, nhãn trên panorama), vì ở đó nền ảnh không đổi theo theme.

## Typography

**Display Font:** Inter (với -apple-system, sans-serif)
**Body Font:** Inter (với -apple-system, sans-serif)
**Brand Font:** Nunito 900, chỉ cho logo chữ "TrạmOTA"

**Character:** Một họ chữ duy nhất, gọn và trung tính như chữ trên bảng giờ. Phân cấp bằng độ đậm (600/700) và cỡ, không bằng đổi font. Nunito tròn và đậm chỉ xuất hiện ở logo, để thương hiệu có một nét riêng mà không lan sang giao diện.

### Hierarchy
- **Display** (700, `clamp(1.7rem, 3.4vw, 2.5rem)`, 1.15, -0.02em): tiêu đề hero trang chủ, tối đa 20ch, `text-wrap: balance`.
- **Headline** (700, `clamp(1.15rem, 1.9vw, 1.45rem)`, 1.25, -0.01em): tiêu đề section ở trang khách.
- **Title** (700, 19px): tiêu đề trang trong cổng quản lý. Tiêu đề thẻ dùng 14px/600.
- **Body** (400, 13.5px, 1.5): chữ giao diện mặc định: nút, ô nhập, nav quản lý, tên khách sạn trên thẻ (600). Bảng dùng 13px.
- **Body lead** (400, 15px, 1.55): đoạn dẫn dưới tiêu đề hero, tối đa 54ch.
- **Label** (500, 12px): nhãn form, chip, chữ phụ. Chữ phụ trên thẻ xuống 11.5–12.5px.
- **Eyebrow** (700, 11.5px, 0.1em, viết hoa, màu xanh ghim): dòng nhỏ trên tiêu đề section. Đầu cột bảng cũng viết hoa nhưng là 11.5px/600, 0.02em, màu mực mờ.

### Named Rules
**The Weight-Not-Font Rule.** Phân cấp bằng 600/700 và cỡ chữ. Không thêm họ font thứ hai cho giao diện; Nunito chỉ dành cho logo.

**The 12px Floor Rule.** Chữ người dùng cần đọc không nhỏ hơn 12px trên mobile. Ô nhập lên 16px ở ≤640px để iOS không tự phóng to.

## Layout

Khung nội dung rộng tối đa 1160px, căn giữa, lề hai bên 20px (16px ở ≤640px). Header công khai cao 56px, dính trên cùng. Cổng quản lý có sidebar 220px bên trái và topbar 56px, nội dung đặt trên nền xám sảnh chờ.

Khoảng cách theo nhịp nhỏ: 6/8/10/12px trong component, 14–20px giữa các khối, 22px dưới tiêu đề section. Hero là chỗ duy nhất có khoảng thở lớn (72px trên, 56px dưới). Lưới thẻ dùng `repeat(auto-fill, minmax(220px, 1fr))`. Bố cục hai cột dùng flex-wrap với cột chính `flex: 2 1 520px` và cột phụ `flex: 1 1 300px`, cả hai `min-width: 0`.

Điểm ngắt chung (theo skill `responsive-ui`):
- **1080px:** lưới 4 cột → 3.
- **860px:** hai cột → xếp dọc; sidebar quản lý → thanh ngang; bỏ sticky của cột phụ.
- **720px:** header công khai chuyển sang menu mobile.
- **640px:** lưới 1–2 cột, form 1 cột, modal rộng hết màn trừ lề 16px.
- **420px:** một cột, nút chính rộng hết hàng.

Bảng luôn nằm trong khung `overflow-x: auto`. Ở 360px không được tràn ngang.

## Elevation & Depth

Hệ thống phẳng theo mặc định. Tầng lớp tạo bằng sắc độ nền (trắng trên xám sảnh chờ, lõm cho ô nhập, panel nổi cho đầu bảng) cộng viền 1px. Chỉ có hai mức bóng, và cả hai đều đổi theo theme.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08)`; tối: `0 8px 24px rgba(0, 0, 0, 0.45)`): thẻ đang hover, ô tìm kiếm ở hero.
- **Pop** (`box-shadow: 0 4px 16px rgba(16, 24, 40, 0.12)`; tối: `0 4px 16px rgba(0, 0, 0, 0.55)`): dropdown, popover, thanh tìm kiếm nổi trên bản đồ.
- **Focus ring** (`box-shadow: 0 0 0 3px var(--color-accent-soft)`): vòng focus của ô nhập. Không phải độ cao, chỉ là trạng thái.

### Named Rules
**The Flat-By-Default Rule.** Bề mặt phẳng khi đứng yên. Bóng chỉ xuất hiện để phản hồi trạng thái (hover) hoặc khi một lớp thật sự nổi trên nội dung (dropdown, popover, thanh trên bản đồ).

## Shapes

Góc bo nhỏ, nhất quán, đếm được trên một bàn tay:
- **Nhỏ** (6px): nút, ô nhập, nút icon, mục nav quản lý.
- **Vừa** (10px): thẻ, panel, khung tìm kiếm.
- **Lớn** (14px): khối lớn đứng riêng: ảnh chính ở trang chi tiết khách sạn/phòng, banner bản đồ, khối tour 360°, khung đăng nhập quản lý, modal hotspot.
- **Viên thuốc** (999px): chip, tag giảm giá, eyebrow hero, badge.
- **Tròn** (50%): avatar, chấm trạng thái, nút tròn trên ảnh.

Viền luôn 1px. Ảnh khách sạn cắt theo tỉ lệ 4:3 trong khung có `overflow: hidden` theo góc của thẻ. Hero có lưới chấm 20px (gợi bản đồ), mờ dần ra mép bằng mask.

## Components

### Buttons
Gọn, chắc tay, không trang trí.
- **Shape:** góc nhỏ (6px), cao 40px, chữ 13.5px/600, icon cách chữ 6px.
- **Primary:** nền xanh ghim, chữ trắng, padding ngang 16px.
- **Hover / Active:** hover đậm lên (xanh ghim đậm); khi bấm lún 1px (`translateY(1px)`, 0.05s). Disabled giảm opacity 0.5.
- **Ghost:** nền trong suốt, viền 1px vạch ray, chữ mực chính; hover đổi viền sang mực nhạt, nền panel nổi.
- **Icon button:** 32×32px, viền 1px, icon màu mực mờ.
- **Link button** (trong bảng): chữ xanh ghim không viền; biến thể nguy hiểm dùng đỏ tín hiệu.

### Chips
- **Style:** viên thuốc, viền 1px, chữ 12–12.5px. Chip lọc/chọn: nền trắng, chữ mực chính.
- **State:** đang chọn → nền nước xanh, viền và chữ xanh ghim, chữ 600. Hover chip chưa chọn → viền mực nhạt. Chip đã gắn (có nút ×) dùng nền lõm; nút × chuyển đỏ khi hover.
- **Tone badges** (`/partner`): viên thuốc nền wash + chữ đặc, 5 tone: success, warning, neutral, danger, info.

### Cards / Containers
- **Corner Style:** góc vừa (10px).
- **Background:** trắng sân ga (panel).
- **Shadow Strategy:** phẳng; hover → viền mực nhạt + bóng Panel.
- **Border:** 1px vạch ray.
- **Internal Padding:** 10–12px ở thẻ khách sạn, 18px ở thẻ form quản lý.

### Inputs / Fields
- **Style:** cao 38px, nền lõm, viền 1px vạch ray, góc nhỏ (6px), chữ 13.5px, padding ngang 10px. Select có mũi tên SVG riêng; textarea tối thiểu 88px.
- **Focus:** viền xanh ghim + vòng nước xanh 3px.
- **Error / Disabled:** thông báo lỗi 12.5px đỏ tín hiệu ngay dưới ô; disabled opacity 0.5.
- **Label:** 12px/500 mực mờ, cách ô 5px.

### Navigation
- **Header công khai:** cao 56px, dính trên cùng, nền panel, viền dưới 1px. Logo chữ Nunito 21px; link nav 13px mực mờ, hover sang mực chính. ≤720px chuyển sang menu mobile.
- **Sidebar quản lý:** rộng 220px, nền panel, viền phải. Mục nav 13.5px/500, padding 9×12px, góc nhỏ; hover nền panel nổi; đang chọn nền nước xanh, chữ xanh ghim. ≤860px chuyển thành thanh ngang.

### Data Tables
- Nằm trong panel góc 10px, cuộn ngang khi hẹp.
- Đầu cột: nền panel nổi, 11.5px/600 viết hoa, mực mờ. Ô: 13px, padding 10×14px, kẻ dưới bằng vạch ray nhạt; hàng cuối không kẻ.

### Search Widget (signature)
Ô tìm kiếm tỉnh/ngày/khách là điểm vào chính của sản phẩm, có hai biến thể:
- **Hero:** panel góc 10px, padding 14px, bóng Panel, đặt giữa hero, rộng tối đa 980px.
- **Bar:** nổi trên bản đồ, nền trắng mờ 92% + `backdrop-filter: blur(10px)`, bóng Pop, mọi số đo thu nhỏ 10%.

### Discount Tag
Viên thuốc nền đỏ wash, chữ đỏ 11px/600; phần trăm nằm trong viên thuốc đỏ đặc chữ trắng ("-20% · Tên ưu đãi"). Khi đè lên ảnh thì dùng nền đỏ đặc để đọc được trên mọi ảnh.

## Do's and Don'ts

### Do:
- **Do** dùng xanh ghim bản đồ chỉ cho hành động, trạng thái đang chọn và focus (The One Signal Rule).
- **Do** lấy màu, bo góc, bóng từ biến CSS trong `src/app/globals.css` (`--color-*`, `--radius-*`, `--shadow-*`), để theme tối tự đổi.
- **Do** tái dùng `src/styles/controls.module.css` (`input`, `select`, `textarea`, `button`, `buttonGhost`, `label`, `field`) qua `composes:` cho mọi form.
- **Do** tạo tầng lớp bằng nền + viền 1px; chỉ thêm bóng khi hover hoặc khi lớp thật sự nổi.
- **Do** giữ chuyển động ngắn (0.15s ease cho trạng thái; `cubic-bezier(0.2, 0.7, 0.2, 1)` cho nội dung hiện ra) và tắt nó dưới `prefers-reduced-motion: reduce`.
- **Do** kiểm mọi giao diện ở 360px, 768px và desktop theo các điểm ngắt ở mục Layout.

### Don't:
- **Don't** viết cứng mã màu trong CSS module. Màu cảnh báo hổ phách hiện viết cứng ở 3 file là nợ cần chuyển thành token, không phải mẫu để chép.
- **Don't** thêm họ font thứ hai cho giao diện; Nunito chỉ dùng cho logo.
- **Don't** đổ bóng cho thẻ hoặc panel khi đứng yên.
- **Don't** dùng góc bo ngoài thang 6/10/14px/viên thuốc; các giá trị lẻ (4, 5, 7, 8, 9, 12px) đang có là ngoại lệ, không nhân rộng.
- **Don't** để chữ người dùng cần đọc nhỏ hơn 12px trên mobile.
