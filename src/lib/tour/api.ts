import { adminGet, adminPost, adminPut } from "@/lib/admin/apiClient";
import type { HotspotInput, Tour, TourHotspot, TourScene, UpdateSceneInput } from "./types";

// Gọi qua proxy admin (/api/admin/tours/*) — cùng cơ chế cookie + tự refresh
// token như module media, không cần route Next.js riêng.
export const getTour = (hotelId: number, roomId?: number) =>
  adminGet<Tour>(`tours/hotels/${hotelId}${roomId ? `?roomId=${roomId}` : ""}`);

export const updateScene = (sceneId: string, input: UpdateSceneInput) =>
  adminPut<TourScene>(`tours/scenes/${sceneId}`, input);

// Ghi ĐÈ toàn bộ hotspot của scene trong 1 lần.
export const saveHotspots = (sceneId: string, hotspots: HotspotInput[]) =>
  adminPut<TourHotspot[]>(`tours/scenes/${sceneId}/hotspots`, { hotspots });

// Editor gọi thay cho getTour: BE bảo đảm mọi ảnh panorama của hotel (cấp hotel + từng
// phòng) đều có scene rồi mới trả tour — nên panorama vừa upload ở trang quản lý
// hotel/phòng luôn xuất hiện. Cũng dùng để làm mới khi tab editor lấy lại focus.
export const syncTour = (hotelId: number) => adminPost<Tour>(`tours/hotels/${hotelId}/sync`, {});
