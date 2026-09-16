import type { PositionAnchor } from "maplibre-gl";

// Mặc định MapLibre luôn chọn anchor "bottom" cho popup gần đáy container (bong
// bóng mở LÊN TRÊN, đuôi trỏ xuống marker) — hợp lý với marker ở giữa/dưới bản
// đồ, nhưng KHÔNG biết map còn bị 1 lớp UI (thanh tìm kiếm) phủ ở phía trên, nên
// marker gần mép trên vẫn mở lên trên và bị lớp UI đó che mất. Hàm này thử TẤT
// CẢ hướng mở hợp lệ (không tràn ra ngoài container, không chui vào vùng bị
// overlay che) rồi chọn hướng che ÍT marker khác nhất — chỉ né overlay thôi thì
// vẫn có thể vô tình đè lên marker kế bên khi bật xuống dưới.
//
// Kích thước card ước lượng từ HotelPopupCard.module.css (width 220px cố định,
// nội dung ~230px cao) — không cần chính xác tuyệt đối, chỉ cần đủ để so sánh
// tương đối giữa các hướng.
const POPUP_WIDTH_PX = 230;
const POPUP_HEIGHT_PX = 260;
const EDGE_MARGIN_PX = 12;
// Nới rộng nhẹ khi kiểm tra marker khác có "lọt" vào vùng popup hay không —
// marker nằm sát mép popup vẫn coi là bị che (khó thấy/khó bấm), không cần
// chạm khít mới tính.
const MARKER_COLLISION_MARGIN_PX = 6;

interface PopupViewport {
    width: number;
    height: number;
    // Khoảng cách từ mép trên container tới điểm THẤP NHẤT bị lớp UI phủ (thanh
    // tìm kiếm) che khuất — 0 nếu không có gì che.
    topInsetPx: number;
}

interface Pixel {
    x: number;
    y: number;
}

interface Rect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

type Vertical = "top" | "bottom";
type Horizontal = "left" | "right" | null;

// vertical mô tả cạnh popup chạm điểm gốc: "bottom" = cạnh dưới popup chạm
// điểm -> popup trải LÊN TRÊN; "top" = cạnh trên chạm điểm -> popup trải
// XUỐNG DƯỚI. horizontal tương tự cho trục ngang.
function rectFor(vertical: Vertical, horizontal: Horizontal, point: Pixel): Rect {
    const [top, bottom] =
        vertical === "bottom" ? [point.y - POPUP_HEIGHT_PX, point.y] : [point.y, point.y + POPUP_HEIGHT_PX];
    const [left, right] =
        horizontal === "left"
            ? [point.x, point.x + POPUP_WIDTH_PX]
            : horizontal === "right"
              ? [point.x - POPUP_WIDTH_PX, point.x]
              : [point.x - POPUP_WIDTH_PX / 2, point.x + POPUP_WIDTH_PX / 2];
    return { left, right, top, bottom };
}

function fitsViewport(rect: Rect, viewport: PopupViewport): boolean {
    return (
        rect.top >= viewport.topInsetPx - EDGE_MARGIN_PX &&
        rect.bottom <= viewport.height + EDGE_MARGIN_PX &&
        rect.left >= -EDGE_MARGIN_PX &&
        rect.right <= viewport.width + EDGE_MARGIN_PX
    );
}

function countCollisions(rect: Rect, otherPoints: Pixel[]): number {
    let count = 0;
    for (const p of otherPoints) {
        if (
            p.x >= rect.left - MARKER_COLLISION_MARGIN_PX &&
            p.x <= rect.right + MARKER_COLLISION_MARGIN_PX &&
            p.y >= rect.top - MARKER_COLLISION_MARGIN_PX &&
            p.y <= rect.bottom + MARKER_COLLISION_MARGIN_PX
        ) {
            count++;
        }
    }
    return count;
}

// `point`: vị trí PIXEL của marker (đã project sẵn — dùng chung với
// computePopupOffset bên dưới nên nhận trực tiếp thay vì tự project lại).
// `otherPoints`: vị trí PIXEL (đã project, đúng vị trí đang render — kể cả
// sau khi tách bởi spiderfy) của các marker KHÁC đang hiện trên bản đồ, để
// tránh chọn hướng mở đè lên chúng. Truyền mảng rỗng nếu không cần xét.
export function pickPopupAnchor(point: Pixel, viewport: PopupViewport, otherPoints: Pixel[] = []): PositionAnchor {
    // Thứ tự duyệt = thứ tự ưu tiên khi các hướng hoà điểm che nhau: mở lên
    // trên trước (kiểu bong bóng mặc định), căn giữa theo chiều ngang trước.
    const verticals: Vertical[] = ["bottom", "top"];
    const horizontals: Horizontal[] = [null, "left", "right"];

    const candidates = verticals.flatMap((vertical) =>
        horizontals.map((horizontal) => {
            const rect = rectFor(vertical, horizontal, point);
            return {
                anchor: (horizontal ? `${vertical}-${horizontal}` : vertical) as PositionAnchor,
                fits: fitsViewport(rect, viewport),
                collisions: countCollisions(rect, otherPoints),
            };
        })
    );

    // Ưu tiên các hướng không tràn ra ngoài container/không chui vào vùng bị
    // overlay che; nếu KHÔNG hướng nào vừa (map quá nhỏ), đành chấp nhận tất
    // cả để vẫn trả về được 1 anchor hợp lý nhất theo số va chạm.
    const fitting = candidates.filter((c) => c.fits);
    const pool = fitting.length > 0 ? fitting : candidates;

    // Array.sort ổn định (stable) nên các hướng hoà số va chạm giữ nguyên thứ
    // tự ưu tiên đã duyệt ở trên.
    pool.sort((a, b) => a.collisions - b.collisions);
    return pool[0].anchor;
}

// Bán kính offset mặc định của maplibregl.Popup trước đây (`offset: 25`) —
// giữ nguyên số này để hành vi KHÔNG đổi ở mọi trường hợp không liên quan
// tới mép search. Công thức cornerOffset copy đúng cách MapLibre tự quy đổi
// offset dạng số cho các anchor chéo (top-left/bottom-right...): chia đều
// theo 2 trục bằng offset/√2, để khoảng cách thực đo ra đúng bằng bán kính.
const DEFAULT_OFFSET_PX = 25;
const CORNER_OFFSET_PX = Math.round(DEFAULT_OFFSET_PX / Math.SQRT2);
// Khoảng hở tối thiểu giữa cạnh trên popup và mép dưới thanh search khi popup
// buộc phải mở xuống (anchor có phần "top") — marker càng sát mép search thì
// càng cần offset lớn hơn 25px mặc định để bù lại, marker đã đủ xa thì không
// đổi gì so với trước.
const SEARCH_EDGE_GAP_PX = 14;

function verticalOf(anchor: PositionAnchor): Vertical | null {
    if (anchor.startsWith("top")) return "top";
    if (anchor.startsWith("bottom")) return "bottom";
    return null;
}

function horizontalOf(anchor: PositionAnchor): Horizontal {
    if (anchor.endsWith("left")) return "left";
    if (anchor.endsWith("right")) return "right";
    return null;
}

// Offset [x, y] cho ĐÚNG anchor đã chọn ở pickPopupAnchor — giống hệt cách
// maplibregl.Popup tự tính từ `offset: 25` (số), CHỈ khác ở chỗ: nếu anchor
// mở xuống ("top"/"top-left"/"top-right") và marker nằm quá sát mép search,
// đẩy offset y lớn hơn để cạnh trên popup luôn cách mép search tối thiểu
// SEARCH_EDGE_GAP_PX thay vì dính sát/lấn vào thanh search.
export function computePopupOffset(anchor: PositionAnchor, point: Pixel, topInsetPx: number): [number, number] {
    const vertical = verticalOf(anchor);
    const horizontal = horizontalOf(anchor);
    const magnitude = horizontal ? CORNER_OFFSET_PX : DEFAULT_OFFSET_PX;

    let offsetY = vertical === "bottom" ? -magnitude : vertical === "top" ? magnitude : 0;
    if (vertical === "top") {
        offsetY = Math.max(offsetY, topInsetPx + SEARCH_EDGE_GAP_PX - point.y);
    }
    const offsetX = horizontal === "left" ? magnitude : horizontal === "right" ? -magnitude : 0;

    return [offsetX, offsetY];
}
