"use client";

import { useEffect, useRef } from "react";
import controls from "@/styles/controls.module.css";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { MediaOwnerType } from "@/lib/media/types";
import styles from "./ThumbnailUploader.module.css";

interface ThumbnailUploaderProps {
  ownerType: MediaOwnerType;
  ownerId: number;
}

// Đúng 1 ảnh/owner (kind cố định "THUMBNAIL") — khác <MediaGallery /> (nhiều
// ảnh, thêm/xoá riêng lẻ). Chọn ảnh mới sẽ THAY THẾ ảnh cũ (BE tự xoá ảnh cũ
// khi confirm, xem MediaService.replaceExistingThumbnail) nên chỉ cho chọn
// 1 file, không có nút xoá riêng — muốn đổi ảnh thì chọn ảnh khác.
export default function ThumbnailUploader({ ownerType, ownerId }: ThumbnailUploaderProps) {
  const { images, uploading, error, reload, upload } = useMediaUpload(ownerType, ownerId, "THUMBNAIL");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const current = images[0];

  useEffect(reload, [reload]); // eslint-disable-line react-hooks/set-state-in-effect -- tải ảnh thumbnail hiện tại từ API, một external system

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) upload([e.target.files[0]]);
    e.target.value = "";
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.preview}>
        {current ? (
          // Mở thẳng URL gốc trên R2 ở tab mới — ảnh thường thì trình xem ảnh có sẵn của
          // trình duyệt (zoom/pan mặc định) là đủ, không cần trang review riêng.
          <a href={current.url} target="_blank" rel="noopener noreferrer" className={styles.previewLink} title="Xem ảnh gốc ở tab mới">
            <ImageWithFallback
              src={current.url}
              alt=""
              className={styles.previewImg}
              fallbackClassName={styles.previewFallback}
              fallback={<span>?</span>}
            />
          </a>
        ) : (
          <span className={styles.previewFallback}>Chưa có ảnh</span>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <button type="button" className={controls.buttonGhost} onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Đang tải lên..." : current ? "Đổi ảnh" : "+ Thêm ảnh"}
      </button>
      {error && <p className={controls.error}>{error}</p>}
    </div>
  );
}
