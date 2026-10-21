import { ClockIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./payment.module.css";

// "14:05", hoặc "26:14:05" khi còn >= 1 giờ (booking cũ được giữ chỗ 30 ngày).
export function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// Đồng hồ giữ chỗ ở màn chọn phương thức (hạn thật từ backend, xem useBookingPayment).
export default function HoldCountdown({ remainingMs, expired }: { remainingMs: number; expired: boolean }) {
    const { t } = useLanguage();
    return (
        <div className={`${styles.countdown} ${expired ? styles.countdownExpired : ""}`}>
            <ClockIcon size={14} weight="bold" />
            {expired ? (
                <span>{t("checkoutPayment.countdownExpired")}</span>
            ) : (
                <>
                    <span>{t("checkoutPayment.countdownLabel")}</span>
                    <span className={styles.countdownValue}>{formatCountdown(remainingMs)}</span>
                </>
            )}
        </div>
    );
}
