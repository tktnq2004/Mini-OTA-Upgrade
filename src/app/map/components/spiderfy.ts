import type { Feature, GeoJsonProperties, Point } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";

// "Spiderfy": khi nhiều marker ở quá gần nhau TRÊN MÀN HÌNH (không nhất
// thiết trùng lat/lng tuyệt đối) tới mức hình ảnh đè khít lên nhau, tách
// chúng ra một vòng tròn nhỏ quanh vị trí gốc để mọi marker đều nhìn thấy và
// bấm được — không ẩn/gộp hotel nào (giữ đúng yêu cầu "không gom cho tôi").
//
// Chỉ bật ở zoom đủ gần: ở zoom quốc gia/tỉnh có thể có hàng chục marker
// chồng nhau ở nhiều cụm khác nhau — tách hết cùng lúc sẽ ra một mớ vòng
// tròn rối mắt, vô nghĩa. Zoom xa vẫn giữ hành vi cũ (marker đè lên nhau,
// vẫn bấm được feature trên cùng).
export const SPIDERFY_MIN_ZOOM = 15;

// Center-to-center dưới ngưỡng này (px) coi là "đè nhau" — xấp xỉ bề ngang 1
// marker (xem MARKER_* trong HotelMarkerBadge), đủ để bắt các trường hợp 2
// hotel ở rất gần nhau (khác toạ độ) mà ảnh vẫn chồng khít.
const OVERLAP_THRESHOLD_PX = 42;
// Bán kính tối thiểu của vòng tròn tách — đảm bảo cụm nhỏ (2-3 marker) vẫn
// tách đủ xa để không tiếp tục đè nhau.
const SPIDERFY_BASE_RADIUS_PX = 34;
// "Chỗ" mỗi marker chiếm dọc theo vòng tròn — cụm càng đông, vòng tròn càng
// phải to ra để marker không đè lẫn nhau NGAY TRÊN chính vòng tròn đó.
const SPIDERFY_MARKER_SPACING_PX = 46;

interface Pixel {
    x: number;
    y: number;
}

// Union-find gộp các điểm có khoảng cách < threshold thành từng cụm (bắc
// cầu — A gần B, B gần C thì A/B/C chung 1 cụm dù A-C có thể hơi xa).
function groupByProximity(points: Pixel[], thresholdPx: number): number[][] {
    const n = points.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => {
        while (parent[i] !== i) {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        return i;
    };

    const thresholdSq = thresholdPx * thresholdPx;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            if (dx * dx + dy * dy < thresholdSq) {
                const rootI = find(i);
                const rootJ = find(j);
                if (rootI !== rootJ) parent[rootI] = rootJ;
            }
        }
    }

    const groups = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
        const root = find(i);
        const bucket = groups.get(root);
        if (bucket) bucket.push(i);
        else groups.set(root, [i]);
    }
    return [...groups.values()];
}

// Trả về danh sách feature MỚI (coordinates đã tách nếu cần) — feature đứng
// riêng lẻ giữ nguyên toạ độ thật, chỉ feature nằm trong 1 cụm chồng nhau mới
// bị dịch. Không có tác dụng phụ lên mảng `features` truyền vào.
export function spiderfyFeatures<P extends GeoJsonProperties>(map: MapLibreMap, features: Feature<Point, P>[]): Feature<Point, P>[] {
    if (features.length < 2 || map.getZoom() < SPIDERFY_MIN_ZOOM) return features;

    const pixels = features.map((feature) => map.project(feature.geometry.coordinates as [number, number]));
    const groups = groupByProximity(pixels, OVERLAP_THRESHOLD_PX);

    const result = features.slice();
    for (const group of groups) {
        if (group.length < 2) continue;

        const centerX = group.reduce((sum, i) => sum + pixels[i].x, 0) / group.length;
        const centerY = group.reduce((sum, i) => sum + pixels[i].y, 0) / group.length;
        const radius = Math.max(SPIDERFY_BASE_RADIUS_PX, (SPIDERFY_MARKER_SPACING_PX * group.length) / (2 * Math.PI));

        group.forEach((featureIndex, position) => {
            const angle = (2 * Math.PI * position) / group.length - Math.PI / 2;
            const spread = map.unproject([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
            result[featureIndex] = {
                ...features[featureIndex],
                geometry: { type: "Point", coordinates: [spread.lng, spread.lat] },
            };
        });
    }
    return result;
}
