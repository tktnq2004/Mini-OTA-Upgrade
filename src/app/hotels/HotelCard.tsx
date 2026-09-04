"use client";

import { MapPinIcon, BuildingsIcon, NavigationArrowIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import type { Hotel } from "@/lib/hotels/types";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./HotelCard.module.css";

interface HotelCardProps {
    hotel: Hotel;
    distanceKm: number | null;
    onBook: () => void;
}

export default function HotelCard({ hotel, distanceKm, onBook }: HotelCardProps) {
    const { t } = useLanguage();

    return (
        <article className={styles.card}>
            <div className={styles.thumbWrap}>
                <ImageWithFallback
                    src={hotel.image}
                    alt={hotel.name}
                    className={styles.thumb}
                    fallbackClassName={styles.thumbFallback}
                    fallback={<BuildingsIcon size={24} weight="light" />}
                />
                {distanceKm !== null && (
                    <span className={styles.distanceBadge}>
                        <NavigationArrowIcon size={11} weight="fill" />
                        {t("hotels.distanceAway", { distance: distanceKm.toFixed(1) })}
                    </span>
                )}
            </div>

            <div className={styles.body}>
                <h3 className={styles.name}>{hotel.name}</h3>
                <p className={styles.address}>
                    <MapPinIcon size={13} />
                    <span>{hotel.address}</span>
                </p>

                <button type="button" className={styles.bookButton} onClick={onBook}>
                    {t("map.viewRoomsAndBook")}
                </button>
            </div>
        </article>
    );
}
