"use client";

import { useEffect, useRef } from "react";
import controls from "@/styles/controls.module.css";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { MediaKind, MediaOwnerType } from "@/lib/media/types";
import { panoramaReviewHref } from "@/lib/media/review";
import styles from "./MediaGallery.module.css";

interface MediaGalleryProps {
  ownerType: MediaOwnerType;
  ownerId: number;
  // Gallery nhiều ảnh dùng cho panorama 360° của Hotel (hành lang, sảnh…) và của
  // từng Room; thumbnail đại diện (đúng 1 ảnh) dùng <ThumbnailUploader /> thay vì
  // component này. Vẫn nhận kind qua prop (không hardcode "PANORAMA") để không phải
  // sửa component nếu sau này có thêm loại gallery nhiều-ảnh khác.
  kind: MediaKind;
}

// Gallery nhiều ảnh (thêm/xoá từng ảnh riêng lẻ) — đối lập với
// <ThumbnailUploader /> (đúng 1 ảnh, upload mới thay thế ảnh cũ).
export default function MediaGallery({ ownerType, ownerId, kind }: MediaGalleryProps) {
  const { images, loading, uploading, error, reload, upload, remove } = useMediaUpload(ownerType, ownerId, kind);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(reload, [reload]); // eslint-disable-line react-hooks/set-state-in-effect -- tải danh sách ảnh ban đầu từ API, một external system

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) upload(e.target.files);
    e.target.value = "";
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.grid}>
        {images.map((img, i) => {
          // Panorama -> trang review riêng (dựng lại khối cầu 360° bằng three.js, xem
          // lib/media/review.ts) vì mở thẳng URL gốc chỉ ra ảnh equirectangular méo hình, không
          // xoay được. Ảnh thường (kind khác, hiện chưa dùng ở component này) -> URL gốc trên
          // R2 là đủ, trình duyệt đã có sẵn trình xem ảnh.
          const label = `${kind === "PANORAMA" ? "Panorama" : "Ảnh"} ${i + 1}`;
          const reviewHref = kind === "PANORAMA" ? panoramaReviewHref(img.url, label) : img.url;
          return (
            <div key={img.id} className={styles.thumb}>
              <a href={reviewHref} target="_blank" rel="noopener noreferrer" className={styles.thumbLink} title={`Xem lớn «${label}»`}>
                <ImageWithFallback
                  src={img.url}
                  alt=""
                  // Ảnh panorama còn được three.js nạp bằng CORS ở tab editor: <img> thường tải
                  // trước sẽ để lại bản cache không có header CORS làm lần nạp đó bị chặn.
                  crossOrigin={kind === "PANORAMA" ? "anonymous" : undefined}
                  className={styles.thumbImg}
                  fallbackClassName={styles.thumbFallback}
                  fallback={<span>?</span>}
                />
              </a>
              <button type="button" className={styles.removeBtn} onClick={() => remove(img.id)} aria-label="Xoá ảnh">
                ×
              </button>
            </div>
          );
        })}
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
