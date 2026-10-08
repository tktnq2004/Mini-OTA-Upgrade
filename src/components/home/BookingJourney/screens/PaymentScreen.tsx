import type { CSSProperties } from "react";
import { BuildingsIcon, CheckCircleIcon, CreditCardIcon, LockSimpleIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import type { JourneyHotel } from "../journeyData";
import styles from "../BookingJourney.module.css";

interface PaymentScreenProps {
    hotel: JourneyHotel;
    checkin: string;
    checkout: string;
    nights: number;
}

const CARD_GROUPS = ["4242", "••••", "••••", "4242"];

// Màn 3 — tóm tắt đặt phòng (dữ liệu khách sạn thật), số thẻ tự điền, nút thanh toán chuyển ✓.
export default function PaymentScreen({ hotel, checkin, checkout, nights }: PaymentScreenProps) {
    const { t } = useLanguage();
    const rows = [
        { label: t("search.checkinLabel"), value: checkin },
        { label: t("search.checkoutLabel"), value: checkout },
        { label: t("search.guestsLabel"), value: t("search.guestsValue", { count: 2 }) },
    ];

    return (
        <div className={styles.screenBody}>
            <div className={`${styles.summary} ${styles.pop}`} style={{ "--d": "0.1s" } as CSSProperties}>
                <div className={styles.summaryHotel}>
                    <ImageWithFallback
                        src={hotel.image}
                        alt=""
                        className={styles.summaryImg}
                        fallbackClassName={styles.summaryImg}
                        fallback={<BuildingsIcon size={18} weight="light" />}
                    />
                    <div className={styles.summaryText}>
                        <strong>{hotel.name}</strong>
                        <span>{hotel.address}</span>
                    </div>
                </div>
                <dl className={styles.summaryRows}>
                    {rows.map((row) => (
                        <div key={row.label}>
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                        </div>
                    ))}
                    <div className={styles.summaryTotal}>
                        <dt>{t("home.steps.pay.total", { nights })}</dt>
                        <dd>{formatVnd(hotel.price * nights)}</dd>
                    </div>
                </dl>
            </div>

            <div className={`${styles.cardField} ${styles.pop}`} style={{ "--d": "0.3s" } as CSSProperties}>
                <span className={styles.fakeLabel}>
                    <CreditCardIcon size={12} weight="bold" /> {t("home.steps.pay.card")}
                </span>
                <span className={`${styles.fakeControl} ${styles.cardNumber}`}>
                    <CreditCardIcon size={16} weight="light" />
                    {CARD_GROUPS.map((group, i) => (
                        <span
                            key={i}
                            className={styles.char}
                            style={{ "--d": `${0.55 + i * 0.16}s` } as CSSProperties}
                        >
                            {group}
                        </span>
                    ))}
                    <span className={styles.cardExpiry}>12/28</span>
                </span>
            </div>

            <div className={styles.payButton}>
                <span className={styles.payIdle}>
                    <LockSimpleIcon size={14} weight="bold" />
                    {t("home.steps.pay.button", { amount: formatVnd(hotel.price * nights) })}
                </span>
                <span className={styles.payDone}>
                    <CheckCircleIcon size={16} weight="fill" />
                    {t("home.steps.pay.done")}
                </span>
            </div>
        </div>
    );
}
