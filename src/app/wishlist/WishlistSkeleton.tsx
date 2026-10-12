import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "./wishlist.module.css";

const GROUPS = [2, 1];

// Khung xương danh sách yêu thích: mỗi nhóm khách sạn (ảnh nhỏ + tên) và vài dòng phòng —
// dùng chung CSS của nhóm thật để kích thước khớp khi dữ liệu về.
export default function WishlistSkeleton({ label }: { label: string }) {
    return (
        <div className={styles.groups} aria-busy="true" aria-label={label}>
            {GROUPS.map((rooms, g) => (
                <div key={g} className={styles.hotelGroup} aria-hidden>
                    <div className={styles.hotelHead}>
                        <Skeleton width={44} height={44} />
                        <div className={styles.hotelInfo}>
                            <Skeleton width="45%" height={14} />
                            <Skeleton width="65%" height={11} />
                        </div>
                    </div>
                    <div className={styles.roomList}>
                        {Array.from({ length: rooms }, (_, r) => (
                            <div key={r} className={styles.roomRow}>
                                <Skeleton width={17} height={17} radius={4} />
                                <Skeleton width={56} height={56} />
                                <div className={styles.roomInfo}>
                                    <Skeleton width={70} height={11} />
                                    <Skeleton width="50%" height={14} />
                                </div>
                                <Skeleton width={90} height={28} />
                            </div>
                        ))}
                    </div>
                    <div className={styles.groupFooter}>
                        <Skeleton width={140} height={12} tone="inset" />
                        <Skeleton width={150} height={38} tone="inset" />
                    </div>
                </div>
            ))}
        </div>
    );
}
