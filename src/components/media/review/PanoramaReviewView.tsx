"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CompassIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, WarningCircleIcon } from "@phosphor-icons/react";
import PanoramaCanvas, { type PanoramaViewHandle } from "@/components/panorama/PanoramaCanvas";
import styles from "./PanoramaReviewView.module.css";

// Mỗi lần bấm nút zoom đổi FOV bấy nhiêu độ — cùng bước với ViewControls của editor hotspot.
const ZOOM_STEP = 8;

// Trang xem panorama 360° toàn màn hình, luôn mở ở TAB MỚI khi bấm vào một panorama trong
// trang quản lý (gallery panorama của hotel/room) hoặc trong cây bên trái của editor hotspot
// — giúp admin/owner xoay thử, phóng to soi nội thất, xác nhận đã chọn đúng ảnh. Chỉ xem —
// không có công cụ đặt hotspot (đó là việc của /admin/tour/{hotelId}). Ảnh thường (không phải
// panorama) không dùng trang này — mở thẳng URL gốc trên R2 là đủ (xem lib/media/review.ts).
// Lỗi tải ảnh (404, CORS...) đã được PanoramaCanvas tự hiện, không cần xử lý thêm ở đây.
export default function PanoramaReviewView() {
  const searchParams = useSearchParams();
  const src = searchParams.get("src") ?? "";

  const viewRef = useRef<PanoramaViewHandle | null>(null);

  if (!src) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <WarningCircleIcon size={32} weight="light" />
          <p>Thiếu đường dẫn panorama.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <PanoramaCanvas ref={viewRef} imageUrl={src} hotspots={[]} />

        <div className={styles.controls}>
          <button type="button" className={styles.controlButton} onClick={() => viewRef.current?.zoom(-ZOOM_STEP)} title="Phóng to" aria-label="Phóng to">
            <MagnifyingGlassPlusIcon size={16} weight="bold" />
          </button>
          <button type="button" className={styles.controlButton} onClick={() => viewRef.current?.zoom(ZOOM_STEP)} title="Thu nhỏ" aria-label="Thu nhỏ">
            <MagnifyingGlassMinusIcon size={16} weight="bold" />
          </button>
          <button type="button" className={styles.controlButton} onClick={() => viewRef.current?.reset()} title="Đặt lại góc nhìn" aria-label="Đặt lại góc nhìn">
            <CompassIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
