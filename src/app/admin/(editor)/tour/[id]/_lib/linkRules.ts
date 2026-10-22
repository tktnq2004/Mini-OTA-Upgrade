import type { TourScene } from "@/lib/tour/types";

// Luật liên kết giữa các panorama (cùng luật với TourService.assertLinkAllowed ở
// backend — BE vẫn kiểm lại khi lưu, đây chỉ để UI không đưa ra lựa chọn sai):
//  - panorama CẤP HOTEL (hành lang, sảnh) -> tới panorama cấp hotel hoặc của MỌI
//    phòng (hành lang phải dẫn được vào phòng);
//  - panorama của PHÒNG R -> chỉ tới panorama cấp hotel hoặc của chính phòng R
//    (muốn sang phòng khác phải quay ra hành lang);
//  - không tự trỏ về chính mình.
export function isLinkAllowed(source: TourScene, target: TourScene): boolean {
  if (source.id === target.id) return false;
  if (source.roomId === null) return true;
  return target.roomId === null || target.roomId === source.roomId;
}

export interface TargetOption {
  id: string;
  label: string;
}

export interface TargetGroup {
  label: string;
  options: TargetOption[];
}

export const HOTEL_LEVEL_LABEL = "Hành lang / khách sạn";

// Các panorama được phép làm đích của `source`, nhóm theo phạm vi (cấp hotel trước,
// rồi từng phòng theo thứ tự `roomOrder`) để <optgroup> không bị dài lê thê khi
// hotel có nhiều phòng.
export function groupTargets(
  source: TourScene,
  scenes: TourScene[],
  roomOrder: number[],
  roomName: (roomId: number) => string
): TargetGroup[] {
  const allowed = scenes.filter((s) => isLinkAllowed(source, s));
  const option = (s: TourScene): TargetOption => ({ id: s.id, label: s.entry ? `${s.nameVi} · Bắt đầu` : s.nameVi });

  const groups: TargetGroup[] = [];
  const hotelLevel = allowed.filter((s) => s.roomId === null);
  if (hotelLevel.length > 0) groups.push({ label: HOTEL_LEVEL_LABEL, options: hotelLevel.map(option) });

  const seen = new Set<number>();
  for (const roomId of roomOrder) {
    const list = allowed.filter((s) => s.roomId === roomId);
    if (list.length > 0) groups.push({ label: roomName(roomId), options: list.map(option) });
    seen.add(roomId);
  }
  // Scene của phòng không còn trong danh sách phòng (hiếm) — vẫn cho chọn.
  for (const s of allowed) {
    if (s.roomId !== null && !seen.has(s.roomId)) {
      groups.push({ label: roomName(s.roomId), options: [option(s)] });
      seen.add(s.roomId);
    }
  }
  return groups;
}
