import Skeleton from "@/components/Skeleton/Skeleton";
import styles from "../account.module.css";

// Khung xương 1 thẻ đặt phòng — dùng chung CSS của thẻ thật trong BookingsView để kích thước khớp.
export default function BookingCardSkeleton() {
  return (
    <div className={styles.bookingCard} aria-hidden>
      <div className={styles.bookingHead}>
        <div className={styles.skeletonStack}>
          <Skeleton width={70} height={15} />
          <Skeleton width={130} height={11} />
        </div>
        <Skeleton width={84} height={22} radius="var(--radius-pill)" />
      </div>

      <Skeleton width={260} height={13} />

      <div className={styles.bookingRooms}>
        <div className={styles.roomLink}>
          <Skeleton width={40} height={30} radius={4} tone="inset" />
          <Skeleton width="45%" height={13} tone="inset" />
        </div>
      </div>

      <div className={styles.bookingTotal}>
        <Skeleton width={70} height={13} />
        <Skeleton width={110} height={17} />
      </div>
    </div>
  );
}
