"use client";

import { useEffect, useRef } from "react";
import controls from "@/styles/controls.module.css";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { MediaOwnerType } from "@/lib/media/types";
import styles from "./MediaGallery.module.css";

interface MediaGalleryProps {
  ownerType: MediaOwnerType;
  ownerId: number;
}

// Component dùng chung cho ảnh hotel VÀ room — nơi duy nhất biết tới module
// media, đặt vào trang chi tiết hotel hoặc trong RoomCard đều dùng chung API
// này, chỉ khác ownerType/ownerId truyền vào.
export default function MediaGallery({ ownerType, ownerId }: MediaGalleryProps) {
  const { images, loading, uploading, error, reload, upload, remove } = useMediaUpload(ownerType, ownerId);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(reload, [reload]); // eslint-disable-line react-hooks/set-state-in-effect -- tải danh sách ảnh ban đầu từ API, một external system

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) upload(e.target.files);
    e.target.value = "";
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.grid}>
        {images.map((img) => (
          <div key={img.id} className={styles.thumb}>
            <ImageWithFallback
              src={img.url}
              alt=""
              className={styles.thumbImg}
              fallbackClassName={styles.thumbFallback}
              fallback={<span>?</span>}
            />
            <button type="button" className={styles.removeBtn} onClick={() => remove(img.id)} aria-label="Xoá ảnh">
              ×
            </button>
          </div>
        ))}
        {!loading && images.length === 0 && <p className={styles.empty}>Chưa có ảnh nào</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      <button type="button" className={controls.buttonGhost} onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Đang tải lên..." : "+ Thêm ảnh"}
      </button>
      {error && <p className={controls.error}>{error}</p>}
    </div>
  );
}
