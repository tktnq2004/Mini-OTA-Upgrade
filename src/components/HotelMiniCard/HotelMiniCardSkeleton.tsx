import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "./HotelMiniCard.module.css";

// Khung xương của HotelMiniCard — dùng chung khung/khoảng cách của thẻ thật để kích thước khớp.
export default function HotelMiniCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.thumbWrap}>
        <Skeleton fill />
      </div>
      <div className={styles.body}>
        <Skeleton width="75%" height={14} />
        <Skeleton width="90%" height={11} />
        <div className={styles.price}>
          <Skeleton width="45%" height={13} />
        </div>
      </div>
    </div>
  );
}
