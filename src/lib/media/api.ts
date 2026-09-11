import { adminDelete, adminGet, adminPost } from "@/lib/admin/apiClient";
import type { ConfirmRequest, MediaAsset, MediaKind, MediaOwnerType, PresignRequest, PresignResponse } from "./types";

// Gọi qua /api/admin/media/* — được proxy chung bởi route
// src/app/api/admin/[...path]/route.ts (đã tự đính cookie + tự refresh
// token), nên module media KHÔNG cần thêm route Next.js riêng nào cả, kể cả
// khi BE (Spring Boot) triển khai controller /media mới.
export const presignMediaUpload = (input: PresignRequest) => adminPost<PresignResponse>("media/presign", input);

export const confirmMediaUpload = (input: ConfirmRequest) => adminPost<MediaAsset>("media/confirm", input);

// kind bỏ trống = lấy tất cả (thumbnail + panorama) của owner này.
export const listMedia = (ownerType: MediaOwnerType, ownerId: number, kind?: MediaKind) =>
  adminGet<MediaAsset[]>(`media?ownerType=${ownerType}&ownerId=${ownerId}${kind ? `&kind=${kind}` : ""}`);

export const deleteMedia = (mediaId: string) => adminDelete<void>(`media/${mediaId}`);
