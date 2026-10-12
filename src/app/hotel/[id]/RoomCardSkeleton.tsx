import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "./RoomCard.module.css";

// 2 nút cạnh nhau trong .actions (gap 8px) — mỗi nút nửa hàng.
const HALF = "calc(50% - 4px)";

// Khung xương của RoomCard — dùng chung khung/khoảng cách của thẻ thật để kích thước khớp.
export default function RoomCardSkeleton() {
    return (
        <div className={styles.card} aria-hidden>
            <div className={styles.thumbWrap}>
                <Skeleton fill />
            </div>
            <div className={styles.body}>
                <Skeleton width="65%" height={16} />
                <Skeleton width="40%" height={12} />
                <div className={styles.amenities}>
                    {[64, 80, 56].map((width) => (
                        <Skeleton key={width} width={width} height={20} radius="var(--radius-pill)" />
                    ))}
                </div>
                <div className={styles.footer}>
                    <Skeleton width="45%" height={17} />
                    <div className={styles.actions}>
                        <Skeleton width={HALF} height={32} />
                        <Skeleton width={HALF} height={32} />
                    </div>
                </div>
            </div>
        </div>
    );
}
