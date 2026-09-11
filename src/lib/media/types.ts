// Module ảnh (media) tách RIÊNG khỏi Hotel/Room — không có field ảnh nào nằm
// trong HotelInput/RoomInput nữa. Hotel hay Room chỉ cần biết "ownerType +
// ownerId" của chính nó, mọi logic upload/lưu-trữ/xoá ảnh nằm gọn trong
// module này, dùng chung cho cả hai.
export type MediaOwnerType = "HOTEL" | "ROOM";

// THUMBNAIL: đúng 1 ảnh/owner — upload mới THAY THẾ ảnh cũ (BE tự xoá ảnh cũ
// khi confirm). Hotel chỉ có THUMBNAIL (đúng yêu cầu: hotel chỉ 1 ảnh).
// PANORAMA: nhiều ảnh 360°/room — chỉ ROOM mới có, thêm/xoá từng ảnh riêng lẻ.
export type MediaKind = "THUMBNAIL" | "PANORAMA";

// mediaId là UUID do BE sinh ra lúc presign — dùng làm tên file trên R2 (chỉ
// với PANORAMA, vì cần duy nhất giữa nhiều ảnh; THUMBNAIL dùng tên file cố
// định "thumbnail.<ext>" nên upload mới tự ghi đè đúng vị trí cũ).
export interface MediaAsset {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: number;
  kind: MediaKind;
  url: string;
  sortOrder: number;
}

export interface PresignRequest {
  ownerType: MediaOwnerType;
  ownerId: number;
  kind: MediaKind;
  contentType: string;
}

// key = đường dẫn object thật trên R2 (vd.
// hotels/3/rooms/12/panorama/<uuid>.jpg) — FE không tự bịa key, luôn dùng
// đúng giá trị BE trả về lúc presign khi gọi confirm, tránh lệch với key BE
// đã ký trong uploadUrl.
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  mediaId: string;
}

export interface ConfirmRequest {
  mediaId: string;
  ownerType: MediaOwnerType;
  ownerId: number;
  kind: MediaKind;
  key: string;
  sortOrder?: number;
}
