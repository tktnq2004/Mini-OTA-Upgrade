import type { CSSProperties } from "react";
import Link from "next/link";
import { CrosshairIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import MapArt from "@/components/home/MapArt/MapArt";
import Reveal from "@/components/home/Reveal/Reveal";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Hotel } from "@/lib/hotels/types";
import { formatCompactVnd } from "@/lib/format";
import styles from "./MapBanner.module.css";

// Vị trí (% khung) cho các pin giá trang trí nửa phải banner.
const PINS = [
    { left: 58, top: 26 },
    { left: 78, top: 18 },
    { left: 70, top: 48 },
    { left: 88, top: 62 },
    { left: 60, top: 70 },
];
// Giá minh hoạ khi chưa có dữ liệu khách sạn thật.
const FALLBACK_PRICES = [850_000, 1_200_000, 1_500_000, 2_700_000, 990_000];

// Banner CTA toàn chiều ngang: "Tìm khách sạn quanh bạn" → trang bản đồ (tính năng cốt lõi).
export default function MapBanner({ hotels }: { hotels: Hotel[] }) {
    const { t } = useLanguage();
    const real = hotels.filter((h) => h.averagePrice !== null).map((h) => h.averagePrice as number);
    const prices = real.length >= PINS.length ? real.slice(0, PINS.length) : FALLBACK_PRICES;

    return (
        <Reveal className={styles.banner}>
            <MapArt />
            <div className={styles.pins}>
                {PINS.map((pos, i) => (
                    <span
                        key={i}
                        className={`${styles.pin} ${i === 0 ? styles.pinActive : ""}`}
                        style={
                            {
                                left: `${pos.left}%`,
                                top: `${pos.top}%`,
                                "--i": i,
                            } as CSSProperties
                        }
                        aria-hidden
                    >
                        {formatCompactVnd(prices[i])}
                    </span>
                ))}
                <span className={styles.me} style={{ left: "86%", top: "40%" }} aria-hidden />
            </div>

            <div className={styles.content}>
                <span className={styles.eyebrow}>
                    <MapTrifoldIcon size={14} weight="bold" />
                    {t("home.mapBanner.eyebrow")}
                </span>
                <h2 className={styles.title}>{t("home.mapBanner.title")}</h2>
                <p className={styles.text}>{t("home.mapBanner.text")}</p>
                <Link href="/map" className={styles.cta}>
                    <CrosshairIcon size={16} weight="bold" />
                    {t("home.mapBanner.cta")}
                </Link>
            </div>
        </Reveal>
    );
}
