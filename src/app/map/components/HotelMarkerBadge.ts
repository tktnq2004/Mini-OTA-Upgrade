import type { Map as MapLibreMap } from "maplibre-gl";

// Marker giá trên bản đồ: 1 ảnh canvas DUY NHẤT gồm pill + đuôi trỏ xuống +
// CHỮ dính liền thành 1 khối (không dùng text-field/text-* của MapLibre).
//
// Lý do bắt buộc phải bake chữ vào ảnh: MapLibre vẽ icon và text của 1 symbol
// layer ở 2 pass GPU riêng biệt (mọi icon trước, rồi mọi text sau) — giới hạn
// kiến trúc đã biết (issue mở trên GitHub maplibre-gl-js về z-order giữa các
// nhóm), không sửa được bằng thuộc tính style. Khi nhiều marker đè lên nhau,
// icon-vs-icon đè đúng thứ tự, nhưng text-vs-icon (khác feature) thì không —
// chữ của marker A có thể trồi lên icon của marker B dù icon A đã bị marker B
// che đúng. Gộp chữ+nền thành 1 ảnh duy nhất loại bỏ hẳn pass text riêng, nên
// pill+chữ luôn là 1 khối, marker sau che trọn marker trước.
//
// Tách riêng file này (thay vì để inline trong useMapInstance) để phần "trông
// marker như thế nào" độc lập với phần "gắn nó vào bản đồ MapLibre ra sao",
// và để chỗ khác trong app (nếu cần hiện lại đúng kiểu marker này — vd. chú
// thích/legend) có thể dùng chung logic vẽ, không phải chép lại.

function getCssVar(name: string, fallback: string): string {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

// Toàn bộ số đo gom về đây, đặt tên rõ ràng để dễ tinh chỉnh lại (đổi 1 số,
// không phải suy ngược cả khối hình học). Đơn vị px LOGICAL (đúng kích thước
// hiển thị thật) — nhân với MARKER_SCALE mới ra px canvas thật.
//
// Kích thước CỐ ĐỊNH, không co giãn theo zoom — đã tra tài liệu chính thức
// Google Maps: marker của họ (và Mapbox/Leaflet/MapLibre nói chung) không hề
// tự to/nhỏ theo zoom, chỉ chọn sẵn 1 kích thước đủ lớn để luôn dễ nhìn.
const MARKER_TEXT_SIZE_PX = 12.5;
const MARKER_PADDING_X_PX = 10; // khoảng trắng trái/phải giữa chữ và mép pill
const MARKER_PADDING_Y_PX = 5; // khoảng trắng trên/dưới giữa chữ và mép pill
// Đuôi nhọn trỏ xuống đúng toạ độ hotel (kiểu bong bóng thoại/pin bản đồ).
const MARKER_TAIL_WIDTH_PX = 9;
const MARKER_TAIL_HEIGHT_PX = 7;
// Bóng đổ mềm, độ mờ thấp — an toàn để dùng lại vì giờ mỗi marker là 1 ảnh
// atomic (pill+chữ+bóng cùng 1 texture), không còn pass text riêng để tạo ra
// hiện tượng lẫn chữ như trước; bóng chỉ làm marker nổi khối hơn trên nền map.
const MARKER_SHADOW_BLUR_PX = 5;
const MARKER_SHADOW_OFFSET_Y_PX = 1.5;
// Chừa biên quanh canvas cho viền + bóng đổ không bị cắt cụt ở mép ảnh.
const MARKER_CANVAS_MARGIN_PX = MARKER_SHADOW_BLUR_PX + 3;
// Vẽ ở độ phân giải cao hơn kích thước hiển thị thật rồi khai pixelRatio khi
// addImage — nếu không, cạnh sẽ bị vỡ nét (blur/răng cưa) trên màn hình retina.
const MARKER_SCALE = 4;

export function hotelMarkerIconId(label: string): string {
    return `hotel-marker:${label}`;
}

interface MarkerIconBitmap {
    width: number;
    height: number;
    pixelRatio: number;
    data: Uint8ClampedArray;
}

// Vẽ 1 ảnh pill+đuôi+CHỮ dính liền cho ĐÚNG 1 nhãn giá cụ thể. Đo trước độ
// rộng chữ để pill tự vừa khít (mỗi ảnh chỉ phục vụ đúng 1 nhãn nên không cần
// 9-patch/icon-text-fit để co giãn động).
export function createHotelMarkerIcon(label: string): MarkerIconBitmap {
    const fontSizePx = MARKER_TEXT_SIZE_PX * MARKER_SCALE;
    const fontFamily = getCssVar("--font-sans", "sans-serif");
    const font = `700 ${fontSizePx}px ${fontFamily}`;

    const measureCtx = document.createElement("canvas").getContext("2d")!;
    measureCtx.font = font;
    const textWidth = measureCtx.measureText(label).width;

    const bodyHeight = fontSizePx + MARKER_PADDING_Y_PX * 2 * MARKER_SCALE;
    const bodyWidth = Math.max(bodyHeight, textWidth + MARKER_PADDING_X_PX * 2 * MARKER_SCALE);
    const tailWidth = MARKER_TAIL_WIDTH_PX * MARKER_SCALE;
    const tailHeight = MARKER_TAIL_HEIGHT_PX * MARKER_SCALE;
    const margin = MARKER_CANVAS_MARGIN_PX * MARKER_SCALE;
    const radius = bodyHeight / 2;

    const shapeX = margin;
    const shapeY = margin;
    const bodyBottom = shapeY + bodyHeight;
    const tailTipY = bodyBottom + tailHeight;
    const tailCenterX = shapeX + bodyWidth / 2;

    const width = bodyWidth + margin * 2;
    const height = tailTipY + margin;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 1 path duy nhất (thân bo tròn hết cỡ + đuôi nhọn giữa cạnh dưới) — tránh
    // lộ đường nối giữa 2 path riêng.
    ctx.beginPath();
    ctx.moveTo(shapeX + radius, shapeY);
    ctx.lineTo(shapeX + bodyWidth - radius, shapeY);
    ctx.arcTo(shapeX + bodyWidth, shapeY, shapeX + bodyWidth, shapeY + radius, radius);
    ctx.lineTo(shapeX + bodyWidth, bodyBottom - radius);
    ctx.arcTo(shapeX + bodyWidth, bodyBottom, shapeX + bodyWidth - radius, bodyBottom, radius);
    ctx.lineTo(tailCenterX + tailWidth / 2, bodyBottom);
    ctx.lineTo(tailCenterX, tailTipY);
    ctx.lineTo(tailCenterX - tailWidth / 2, bodyBottom);
    ctx.lineTo(shapeX + radius, bodyBottom);
    ctx.arcTo(shapeX, bodyBottom, shapeX, bodyBottom - radius, radius);
    ctx.lineTo(shapeX, shapeY + radius);
    ctx.arcTo(shapeX, shapeY, shapeX + radius, shapeY, radius);
    ctx.closePath();

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
    ctx.shadowBlur = MARKER_SHADOW_BLUR_PX * MARKER_SCALE;
    ctx.shadowOffsetY = MARKER_SHADOW_OFFSET_Y_PX * MARKER_SCALE;
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = MARKER_SCALE;
    ctx.strokeStyle = getCssVar("--color-border", "#e3e5e8");
    ctx.stroke();

    // Chữ vẽ NGAY TRÊN CÙNG canvas này — đây chính là điểm mấu chốt khiến
    // pill+chữ luôn là 1 khối duy nhất khi các marker chồng lên nhau.
    ctx.font = font;
    ctx.fillStyle = getCssVar("--color-accent-strong", "#1d4ed8");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, shapeX + bodyWidth / 2, shapeY + bodyHeight / 2 + 0.5 * MARKER_SCALE);

    return { width, height, pixelRatio: MARKER_SCALE, data: ctx.getImageData(0, 0, width, height).data };
}

// Đăng ký ảnh cho mọi nhãn CHƯA có sẵn trên bản đồ — idempotent (map.hasImage
// kiểm tra trước), gọi lại an toàn mỗi khi danh sách nhãn đổi (lọc/tìm kiếm
// ra hotel với mức giá mới chưa từng thấy).
export function ensureHotelMarkerIcons(map: MapLibreMap, labels: Iterable<string>) {
    for (const label of new Set(labels)) {
        const id = hotelMarkerIconId(label);
        if (map.hasImage(id)) continue;
        const icon = createHotelMarkerIcon(label);
        map.addImage(id, { width: icon.width, height: icon.height, data: icon.data }, { pixelRatio: icon.pixelRatio });
    }
}
