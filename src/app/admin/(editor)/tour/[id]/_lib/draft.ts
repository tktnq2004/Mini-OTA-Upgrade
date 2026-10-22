import type { HotspotInput, HotspotType, TourHotspot } from "@/lib/tour/types";

// Bản nháp hotspot đang sửa trong editor — chưa lưu lên server. `key` chỉ là
// định danh cục bộ để React/selection phân biệt các hotspot (kể cả hotspot
// vừa tạo, chưa có id thật từ server).
export interface HotspotDraft extends HotspotInput {
  key: string;
}

export function toDrafts(hotspots: TourHotspot[]): HotspotDraft[] {
  return hotspots.map((h) => ({
    key: h.id,
    type: h.type,
    yaw: h.yaw,
    pitch: h.pitch,
    nameVi: h.nameVi,
    nameEn: h.nameEn ?? "",
    descriptionVi: h.descriptionVi ?? "",
    descriptionEn: h.descriptionEn ?? "",
    targetSceneId: h.targetSceneId,
  }));
}

export function toInputs(drafts: HotspotDraft[]): HotspotInput[] {
  return drafts.map((d) => ({
    type: d.type,
    yaw: d.yaw,
    pitch: d.pitch,
    nameVi: d.nameVi.trim(),
    nameEn: d.nameEn.trim(),
    descriptionVi: d.descriptionVi.trim(),
    descriptionEn: d.descriptionEn.trim(),
    targetSceneId: d.type === "NAVIGATION" ? d.targetSceneId : null,
  }));
}

export function newDraft(type: HotspotType, yaw: number, pitch: number): HotspotDraft {
  return {
    key: crypto.randomUUID(),
    type,
    yaw,
    pitch,
    nameVi: "",
    nameEn: "",
    descriptionVi: "",
    descriptionEn: "",
    targetSceneId: null,
  };
}

// Trả về thông báo lỗi đầu tiên tìm thấy (để chặn lưu và chỉ đúng hotspot
// sai), hoặc null nếu hợp lệ. Server vẫn kiểm lại — đây chỉ để phản hồi nhanh.
export function validateDrafts(drafts: HotspotDraft[]): string | null {
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (!d.nameVi.trim()) return `Hotspot #${i + 1}: cần nhập tên tiếng Việt`;
    if (d.type === "NAVIGATION" && !d.targetSceneId) return `Hotspot #${i + 1} («${d.nameVi}»): cần chọn panorama đích`;
  }
  return null;
}
