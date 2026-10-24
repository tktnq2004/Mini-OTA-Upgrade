import type { BookingPaymentStatus } from "@/lib/booking/resources";
import { STATUS_LABEL, STATUS_TONE, type StatusTone } from "@/lib/partner/bookings";
import styles from "../partner.module.css";

const TONE_CLASS: Record<StatusTone, string> = {
    success: styles.toneSuccess,
    warning: styles.toneWarning,
    neutral: styles.toneNeutral,
    danger: styles.toneDanger,
};

// Nhãn trạng thái thanh toán của 1 đơn đặt phòng.
export default function StatusBadge({ status }: { status: BookingPaymentStatus }) {
    return <span className={`${styles.badge} ${TONE_CLASS[STATUS_TONE[status]]}`}>{STATUS_LABEL[status]}</span>;
}
