import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "./HotelCard.module.css";

// Khung xương của HotelCard — dùng chung khung/khoảng cách của thẻ thật để kích thước khớp,
// trang không nhảy khi dữ liệu về.
export default function HotelCardSkeleton() {
    return (
        <div className={styles.card} aria-hidden>
            <div className={styles.thumbWrap}>
                <Skeleton fill />
            </div>
            <div className={styles.body}>
                <Skeleton width="72%" height={16} />
                <Skeleton width="90%" height={12} />
                <Skeleton width="55%" height={12} />
                <div className={styles.skeletonButton}>
                    <Skeleton height={34} />
                </div>
            </div>
        </div>
    );
}
