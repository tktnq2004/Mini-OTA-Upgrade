import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import styles from "./TourEditor.module.css";

// Sân khấu khi khách sạn chưa có panorama nào — chỉ dẫn sang trang quản lý để upload.
export default function EmptyStage({ hotelId }: { hotelId: number }) {
  return (
    <div className={styles.emptyStage}>
      <p className={styles.emptyTitle}>Khách sạn này chưa có panorama nào</p>
      <p className={styles.hint} style={{ maxWidth: 400 }}>
        Upload ảnh 360° ở trang quản lý khách sạn (hành lang, sảnh…) và ở từng phòng. Quay lại tab này là thấy ngay
        trong danh sách bên trái — sau đó mới gắn hotspot để nối chúng lại.
      </p>
      <a
        className={styles.primaryButton}
        href={`/admin/hotels/${hotelId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none" }}
      >
        Mở trang quản lý khách sạn
        <ArrowSquareOutIcon size={14} weight="bold" />
      </a>
    </div>
  );
}
