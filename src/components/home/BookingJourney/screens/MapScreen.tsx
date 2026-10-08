import type { CSSProperties } from "react";
import { BuildingsIcon, MapPinIcon } from "@phosphor-icons/react";
import MapArt from "@/components/home/MapArt/MapArt";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import type { JourneyHotel } from "../journeyData";
import styles from "../BookingJourney.module.css";

// Toạ độ (% khung bản đồ) cho từng pin — pin đầu (rẻ nhất) đặt gần giữa vì sẽ được chọn.
const PIN_POSITIONS = [
    { left: 46, top: 40 },
    { left: 22, top: 24 },
    { left: 70, top: 20 },
    { left: 76, top: 52 },
    { left: 18, top: 58 },
];

// Màn 2 — bản đồ tối giản, các pin giá bật lên lần lượt, pin rẻ nhất được chọn và mở thẻ xem nhanh.
export default function MapScreen({ hotels }: { hotels: JourneyHotel[] }) {
    const { t } = useLanguage();
    const selected = hotels[0];

    return (
        <div className={styles.map}>
            <MapArt />

            {hotels.slice(0, PIN_POSITIONS.length).map((hotel, i) => (
                <span
                    key={hotel.id}
                    className={`${styles.pin} ${i === 0 ? styles.pinSelected : ""}`}
                    style={
                        {
                            left: `${PIN_POSITIONS[i].left}%`,
                            top: `${PIN_POSITIONS[i].top}%`,
                            "--d": `${0.15 + i * 0.1}s`,
                        } as CSSProperties
                    }
                >
                    {formatCompactVnd(hotel.price)}
                </span>
            ))}

            {selected && (
                <div className={`${styles.mapCard} ${styles.pop}`} style={{ "--d": "0.95s" } as CSSProperties}>
                    <ImageWithFallback
                        src={selected.image}
                        alt=""
                        className={styles.mapCardImg}
                        fallbackClassName={styles.mapCardImg}
                        fallback={<BuildingsIcon size={20} weight="light" />}
                    />
                    <div className={styles.mapCardBody}>
                        <span className={styles.badge}>{t("home.steps.map.cheapest")}</span>
                        <strong className={styles.mapCardName}>{selected.name}</strong>
                        <span className={styles.mapCardAddress}>
                            <MapPinIcon size={12} />
                            {selected.address}
                        </span>
                        <span className={styles.mapCardPrice}>
                            <strong>{formatVnd(selected.price)}</strong> {t("room.perNight")}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
