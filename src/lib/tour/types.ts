// Kiểu dữ liệu khớp đúng response/request của module tour ở backend
// (com.Mini_OTA.rebuild.tour). Vị trí hotspot là yaw/pitch (độ), cùng quy ước
// lon/lat của viewer three.js — xem geometry.ts.
export type HotspotType = "NAVIGATION" | "INFO";

export interface TourHotspot {
  id: string;
  type: HotspotType;
  yaw: number;
  pitch: number;
  nameVi: string;
  nameEn: string | null;
  descriptionVi: string | null;
  descriptionEn: string | null;
  /** Chỉ NAVIGATION. */
  targetSceneId: string | null;
}

export interface TourScene {
  id: string;
  mediaId: string;
  imageUrl: string;
  /** null = scene cấp hotel (hành lang, sảnh...); có giá trị = scene của room đó. */
  roomId: number | null;
  nameVi: string;
  nameEn: string | null;
  /** Scene mở đầu của phạm vi chứa nó (1 cho hotel, 1 cho mỗi room). */
  entry: boolean;
  sortOrder: number;
  hotspots: TourHotspot[];
}

export interface Tour {
  hotelId: number;
  /** Scene bắt đầu (theo roomId nếu có); null khi hotel chưa có scene nào. */
  startSceneId: string | null;
  scenes: TourScene[];
}

export interface HotspotInput {
  type: HotspotType;
  yaw: number;
  pitch: number;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  targetSceneId: string | null;
}

export interface UpdateSceneInput {
  nameVi: string;
  nameEn?: string;
  entry?: boolean;
  sortOrder?: number;
}
