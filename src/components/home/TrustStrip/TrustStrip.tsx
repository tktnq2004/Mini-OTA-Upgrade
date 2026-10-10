import { BuildingsIcon, LightningIcon, MapPinAreaIcon, ShieldCheckIcon, type Icon } from "@phosphor-icons/react";
import CountUp from "@/components/home/CountUp/CountUp";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./TrustStrip.module.css";

interface TrustStripProps {
    /** null = chưa có số liệu (API lỗi/đang tải) — hiện câu chữ thay cho con số. */
    totalHotels: number | null;
    provinceCount: number | null;
}

interface Item {
    Icon: Icon;
    value: number | null;
    title: string;
    caption: string;
}

// Dải tín hiệu tin cậy ngay dưới ô tìm kiếm: 2 con số thật từ API + 2 cam kết dịch vụ.
export default function TrustStrip({ totalHotels, provinceCount }: TrustStripProps) {
    const { t } = useLanguage();
    const items: Item[] = [
        {
            Icon: BuildingsIcon,
            value: totalHotels,
            title: t("home.trust.hotelsTitle"),
            caption: t("home.trust.hotels"),
        },
        {
            Icon: MapPinAreaIcon,
            value: provinceCount,
            title: t("home.trust.provincesTitle"),
            caption: t("home.trust.provinces"),
        },
        { Icon: ShieldCheckIcon, value: null, title: t("home.trust.secureTitle"), caption: t("home.trust.secure") },
        { Icon: LightningIcon, value: null, title: t("home.trust.instantTitle"), caption: t("home.trust.instant") },
    ];

    return (
        <div className={styles.wrap}>
            <ul className={styles.strip}>
                {items.map(({ Icon, value, title, caption }) => (
                    <li key={title} className={styles.item}>
                        <span className={styles.icon}>
                            <Icon size={20} weight="light" />
                        </span>
                        <span className={styles.text}>
                            <strong>{value ? <CountUp value={value} /> : title}</strong>
                            <span>{caption}</span>
                        </span>
                    </li>
                ))}
            </ul>

            {/* Logo thẻ được nhận qua Stripe — tín hiệu tin cậy ngay dưới ô tìm kiếm. */}
            <div className={styles.payments}>
                <span>{t("home.trust.payWith")}</span>
                <span className={styles.badge} role="img" aria-label="Visa">
                    <svg viewBox="0 0 48 16" aria-hidden>
                        <text
                            x="24"
                            y="13"
                            textAnchor="middle"
                            fontSize="15"
                            fontWeight="800"
                            fontStyle="italic"
                            fill="#1a1f71"
                        >
                            VISA
                        </text>
                    </svg>
                </span>
                <span className={styles.badge} role="img" aria-label="Mastercard">
                    <svg viewBox="0 0 32 20" aria-hidden>
                        <circle cx="12" cy="10" r="8" fill="#eb001b" />
                        <circle cx="20" cy="10" r="8" fill="#f79e1b" />
                        <path d="M16 3.8a8 8 0 0 1 0 12.4a8 8 0 0 1 0-12.4Z" fill="#ff5f00" />
                    </svg>
                </span>
                <span className={styles.badge} role="img" aria-label="Stripe">
                    <svg viewBox="0 0 48 16" aria-hidden>
                        <text x="24" y="12.5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#635bff">
                            stripe
                        </text>
                    </svg>
                </span>
            </div>
        </div>
    );
}
