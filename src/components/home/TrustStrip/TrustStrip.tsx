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
        { Icon: BuildingsIcon, value: totalHotels, title: t("home.trust.hotelsTitle"), caption: t("home.trust.hotels") },
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
    );
}
