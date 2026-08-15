"use client";

import { MapPinIcon, BuildingsIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback";
import type { Hotel } from "@/data/hotels.data";
import styles from "./HotelPopupCard.module.css";

interface HotelPopupCardProps {
    hotel: Hotel;
    onBook: () => void;
    bookLabel: string;
}

// Component này được render vào một React root tách biệt (bên trong popup
// MapLibre) chứ không nằm trong cây React chính, nên không đọc được
// LanguageProvider qua Context — chữ dịch phải truyền vào qua props từ Map.tsx.
export default function HotelPopupCard({ hotel, onBook, bookLabel }: HotelPopupCardProps) {
    return (
        <div className={styles.card}>
            <ImageWithFallback
                src={hotel.thumbnail}
                alt={hotel.name}
                className={styles.thumb}
                fallbackClassName={styles.thumbFallback}
                fallback={<BuildingsIcon size={22} weight="light" />}
            />
            <div className={styles.body}>
                <h4 className={styles.name}>{hotel.name}</h4>
                <p className={styles.address}>
                    <MapPinIcon size={12} />
                    <span>{hotel.address}</span>
                </p>
                <button type="button" className={styles.bookButton} onClick={onBook}>
                    {bookLabel}
                </button>
            </div>
        </div>
    );
}
