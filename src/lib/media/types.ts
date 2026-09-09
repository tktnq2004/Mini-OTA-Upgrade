// Module ảnh (media) tách RIÊNG khỏi Hotel/Room — không có field ảnh nào nằm
// trong HotelInput/RoomInput nữa. Hotel hay Room chỉ cần biết "ownerType +
// ownerId" của chính nó rồi đưa cho <MediaGallery />, mọi logic
// upload/lưu-trữ/xoá ảnh nằm gọn trong module này, dùng chung cho cả hai.
export type MediaOwnerType = "HOTEL" | "ROOM";

// mediaId là UUID do BE sinh ra (dùng làm luôn tên file trên R2, tránh đụng
// tên khi nhiều ảnh upload cùng lúc) — khác với id số tự tăng của
// Hotel/Room, vì module này độc lập, không cần theo quy ước cũ.
export interface MediaAsset {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: number;
  url: string;
  sortOrder: number;
}

export interface PresignRequest {
  ownerType: MediaOwnerType;
  ownerId: number;
  contentType: string;
}

// key = đường dẫn object thật trên R2 (vd. media/ROOM/12/<uuid>.jpg) — FE
// không tự bịa key, luôn dùng đúng giá trị BE trả về lúc presign khi gọi
// confirm, tránh lệch với key BE đã ký trong uploadUrl.
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  mediaId: string;
}

export interface ConfirmRequest {
  mediaId: string;
  ownerType: MediaOwnerType;
  ownerId: number;
  key: string;
  sortOrder?: number;
}
