import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "../payment.module.css";

// Khung xương trang thanh toán trong lúc tải đơn: vòng biểu tượng + tiêu đề + hoá đơn —
// cùng CSS với trạng thái "chọn phương thức" để thẻ không đổi cỡ khi dữ liệu về.
export default function PaymentSkeleton() {
    return (
        <>
            <div className={styles.statusBlock} aria-hidden>
                <Skeleton width={68} height={68} circle />
                <Skeleton width={200} height={22} />
                <Skeleton width={170} height={28} radius="var(--radius-pill)" />
            </div>

            <div className={styles.invoice} aria-hidden>
                <Skeleton width={90} height={10} tone="inset" />
                <div className={styles.invoiceHotel}>
                    <Skeleton width={20} height={20} tone="inset" />
                    <div className={styles.skeletonStack}>
                        <Skeleton width={180} height={15} tone="inset" />
                        <Skeleton width={230} height={11} tone="inset" />
                    </div>
                </div>

                <div className={styles.invoiceDivider} />

                <div className={styles.dateChips}>
                    <div className={styles.dateChip}>
                        <Skeleton width={60} height={10} />
                        <Skeleton width={90} height={13} />
                    </div>
                    <div className={styles.dateChip}>
                        <Skeleton width={60} height={10} />
                        <Skeleton width={90} height={13} />
                    </div>
                </div>

                <div className={styles.invoiceRoomRow}>
                    <Skeleton width="55%" height={13} tone="inset" />
                </div>

                <div className={styles.invoiceDivider} />

                <div className={styles.skeletonStack}>
                    <Skeleton width={120} height={10} tone="inset" />
                    <Skeleton width={160} height={12} tone="inset" />
                    <Skeleton width={190} height={12} tone="inset" />
                    <Skeleton width={120} height={12} tone="inset" />
                </div>

                <div className={styles.invoiceDivider} />

                <div className={styles.invoiceTotalRow}>
                    <Skeleton width={70} height={13} tone="inset" />
                    <Skeleton width={120} height={18} tone="inset" />
                </div>
            </div>
        </>
    );
}
