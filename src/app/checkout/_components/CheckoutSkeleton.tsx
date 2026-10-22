import Skeleton from "@/components/Skeleton/Skeleton";
import FieldSkeleton from "@/components/Skeleton/FieldSkeleton";
import styles from "../checkout.module.css";

// Khung xương phần form + tóm tắt đơn của CheckoutView trong lúc tải khách sạn/phòng —
// dùng chung CSS của trang thật để 2 cột không nhảy khi dữ liệu về.
export default function CheckoutSkeleton() {
    return (
        <div className={styles.grid} aria-hidden>
            <div className={styles.formColumn}>
                <div className={styles.formSection}>
                    <Skeleton width={160} height={15} />
                    <Skeleton width="70%" height={12} />
                    <div className={styles.fieldRow}>
                        <FieldSkeleton labelWidth={70} />
                        <FieldSkeleton labelWidth={60} />
                    </div>
                    <div className={styles.fieldRow}>
                        <FieldSkeleton labelWidth={40} />
                        <FieldSkeleton labelWidth={90} />
                    </div>
                    <FieldSkeleton labelWidth={60} />
                    <Skeleton height={60} />
                </div>
            </div>

            <div className={styles.summaryColumn}>
                <div className={styles.summaryCard}>
                    <Skeleton width={130} height={15} />
                    <Skeleton height={250} />
                    <div className={styles.summaryDivider} />
                    <Skeleton width={150} height={15} />
                    <div className={styles.summaryHotelGroup}>
                        <div className={styles.summaryHotelHead}>
                            <Skeleton width={36} height={36} />
                            <div className={styles.skeletonStack}>
                                <Skeleton width={150} height={13} />
                                <Skeleton width={190} height={11} />
                            </div>
                        </div>
                        <div className={styles.summaryRoomRow}>
                            <Skeleton width={30} height={30} />
                            <Skeleton width="55%" height={12} />
                        </div>
                    </div>
                    <div className={styles.summaryTotalRow}>
                        <Skeleton width={70} height={13} />
                        <Skeleton width={120} height={18} />
                    </div>
                    <Skeleton height={42} />
                </div>
            </div>
        </div>
    );
}
