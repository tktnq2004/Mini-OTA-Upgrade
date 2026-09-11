"use client";

import { useCallback, useState } from "react";
import { AdminApiError } from "@/lib/admin/apiClient";
import { confirmMediaUpload, deleteMedia, listMedia, presignMediaUpload } from "@/lib/media/api";
import type { MediaAsset, MediaKind, MediaOwnerType } from "@/lib/media/types";

interface UseMediaUploadResult {
  images: MediaAsset[];
  loading: boolean;
  uploading: boolean;
  error: string;
  reload: () => void;
  upload: (files: FileList | File[]) => Promise<void>;
  remove: (mediaId: string) => Promise<void>;
}

// Hook dùng chung cho cả 2 kiểu ảnh (THUMBNAIL: đúng 1 ảnh, upload mới tự
// thay thế ảnh cũ ở BE; PANORAMA: nhiều ảnh, thêm/xoá riêng lẻ) và cả 2
// owner (hotel/room) — chỉ khác ownerType/ownerId/kind truyền vào. Toàn bộ
// luồng 3 bước (xin presigned URL -> PUT thẳng lên R2 -> confirm để BE lưu
// DB) nằm gọn ở đây, component chỉ lo hiển thị.
export function useMediaUpload(ownerType: MediaOwnerType, ownerId: number, kind: MediaKind): UseMediaUploadResult {
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    listMedia(ownerType, ownerId, kind)
      .then(setImages)
      .catch((e) => setError(e instanceof AdminApiError ? e.message : "Không tải được ảnh"))
      .finally(() => setLoading(false));
  }, [ownerType, ownerId, kind]);

  const uploadOne = async (file: File) => {
    const { uploadUrl, key, mediaId } = await presignMediaUpload({ ownerType, ownerId, kind, contentType: file.type });

    // Upload thẳng browser -> R2, KHÔNG qua Next proxy/Spring Boot — proxy
    // hiện tại chỉ forward JSON, không hợp để tải file nhị phân.
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error(`Upload lên R2 thất bại (mã ${putRes.status})`);

    await confirmMediaUpload({ mediaId, ownerType, ownerId, kind, key });
  };

  const upload = async (files: FileList | File[]) => {
    setError("");
    setUploading(true);
    try {
      // Tuần tự từng file — đơn giản và đủ dùng cho vài ảnh một lần; không
      // Promise.all để tránh làm ngập presign request cùng lúc. Với
      // THUMBNAIL, chọn nhiều file thì chỉ ảnh CUỐI CÙNG còn tồn tại (mỗi
      // lần confirm BE tự xoá ảnh thumbnail trước đó).
      for (const file of Array.from(files)) {
        await uploadOne(file);
      }
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (mediaId: string) => {
    setError("");
    try {
      await deleteMedia(mediaId);
      setImages((current) => current.filter((img) => img.id !== mediaId));
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : "Xoá ảnh thất bại");
    }
  };

  return { images, loading, uploading, error, reload, upload, remove };
}
