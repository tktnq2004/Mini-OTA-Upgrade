import type { CSSProperties } from "react";
import { CheckCircleIcon, CubeIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { JourneyHotel } from "../journeyData";
import styles from "../BookingJourney.module.css";

interface CheckInScreenProps {
    hotel: JourneyHotel;
    checkin: string;
    /** Chỉ gắn ảnh 360° (~650KB) khi người dùng đã cuộn tới gần bước này. */
    loadPanorama: boolean;
}

// Mã QR minh hoạ: lưới 9×9 cố định (3 ô định vị ở góc + nhiễu theo công thức), không phải mã thật.
const QR_SIZE = 9;
const isFinder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) => x >= bx && x < bx + 3 && y >= by && y < by + 3;
    return inBox(0, 0) || inBox(QR_SIZE - 3, 0) || inBox(0, QR_SIZE - 3);
};
const QR_CELLS = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
    const x = i % QR_SIZE;
    const y = Math.floor(i / QR_SIZE);
    // Chừa 1 hàng trống quanh ô định vị để nhìn ra dáng mã QR.
    const nearFinder = (x < 4 && y < 4) || (x >= QR_SIZE - 4 && y < 4) || (x < 4 && y >= QR_SIZE - 4);
    return isFinder(x, y) || (!nearFinder && (x * 7 + y * 13 + x * y) % 3 === 0);
});

// Màn 4 — phiếu xác nhận đặt phòng + xem trước phòng 360° (ảnh tour thật của site).
export default function CheckInScreen({ hotel, checkin, loadPanorama }: CheckInScreenProps) {
    const { t } = useLanguage();
    const code = `WG-${String(Math.abs(hotel.id) * 7919).padStart(6, "0").slice(-6)}`;

    return (
        <div className={styles.screenBody}>
            <div className={`${styles.ticket} ${styles.pop}`} style={{ "--d": "0.1s" } as CSSProperties}>
                <div className={styles.ticketInfo}>
                    <span className={styles.ticketStatus}>
                        <CheckCircleIcon size={16} weight="fill" />
                        {t("home.steps.checkin.confirmed")}
                    </span>
                    <strong className={styles.ticketHotel}>{hotel.name}</strong>
                    <dl className={styles.ticketRows}>
                        <div>
                            <dt>{t("home.steps.checkin.code")}</dt>
                            <dd>{code}</dd>
                        </div>
                        <div>
                            <dt>{t("search.checkinLabel")}</dt>
                            <dd>{checkin}</dd>
                        </div>
                    </dl>
                </div>
                <div className={`${styles.qr} ${styles.pop}`} style={{ "--d": "0.3s" } as CSSProperties} aria-hidden>
                    {QR_CELLS.map((on, i) => (
                        <span key={i} className={on ? styles.qrOn : undefined} />
                    ))}
                </div>
            </div>

            <div className={`${styles.pano} ${styles.pop}`} style={{ "--d": "0.35s" } as CSSProperties}>
                {loadPanorama && <div className={styles.panoStrip} />}
                <span className={styles.panoBadge}>
                    <CubeIcon size={14} weight="bold" />
                    {t("home.steps.checkin.preview")}
                </span>
            </div>
        </div>
    );
}
