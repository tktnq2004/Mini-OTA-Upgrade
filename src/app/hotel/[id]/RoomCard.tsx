"use client";

import { useRouter } from "next/navigation";
import { BedIcon, UsersIcon, ArrowsOutIcon, CheckIcon } from "@phosphor-icons/react";
import { ROOM_TYPE_LABELS, formatVnd, type Room } from "@/data/rooms.data";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCart } from "@/components/cart/CartProvider";
import styles from "./RoomCard.module.css";

const VISIBLE_AMENITIES = 4;

interface RoomCardProps {
    room: Room;
    nights: number;
    checkin: string;
    checkout: string;
    guests: number;
}

export default function RoomCard({ room, nights, checkin, checkout, guests }: RoomCardProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { isInCart, addItem, removeItem } = useCart();
    const selected = isInCart(room.hotelId, room.id);
    const visibleAmenities = room.amenities.slice(0, VISIBLE_AMENITIES);
    const extraCount = room.amenities.length - visibleAmenities.length;
    const total = room.price * nights;

    const toggleCart = () => {
        if (selected) {
            removeItem(room.hotelId, room.id);
        } else {
            addItem(room.hotelId, room.id, { checkin, checkout, guests });
        }
    };

    const bookNow = () => {
        const params = new URLSearchParams({
            hotelId: String(room.hotelId),
            roomId: room.id,
            checkin,
            checkout,
            guests: String(guests),
        });
        router.push(`/checkout?${params.toString()}`);
    };

    return (
        <article className={styles.card}>
            <div className={styles.thumbWrap}>
                <ImageWithFallback
                    src={room.thumbnail}
                    alt={room.name}
                    className={styles.thumb}
                    fallbackClassName={styles.thumbFallback}
                    fallback={<BedIcon size={22} weight="light" />}
                />
                <span className={styles.typeBadge}>{ROOM_TYPE_LABELS[room.roomType]}</span>
            </div>

            <div className={styles.body}>
                <h3 className={styles.name}>{room.name}</h3>

                <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                        <UsersIcon size={14} /> {t("room.maxGuests", { count: room.capacity })}
                    </span>
                    <span className={styles.metaItem}>
                        <ArrowsOutIcon size={14} /> {room.sizeSqm} m²
                    </span>
                </div>

                <ul className={styles.amenities}>
                    {visibleAmenities.map((a) => (
                        <li key={a} className={styles.amenity}>
                            <CheckIcon size={12} weight="bold" />
                            {a}
                        </li>
                    ))}
                    {extraCount > 0 && (
                        <li className={styles.amenityMore}>
                            {t("room.moreAmenities", { count: extraCount })}
                        </li>
                    )}
                </ul>

                <div className={styles.footer}>
                    <div className={styles.price}>
                        <strong>{formatVnd(room.price)}</strong>
                        <span> {t("room.perNight")}</span>
                        {nights > 1 && (
                            <span className={styles.priceTotal}>
                                {t("room.totalForNights", { total: formatVnd(total), count: nights })}
                            </span>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={selected ? styles.selectButtonActive : styles.selectButton}
                            onClick={toggleCart}
                        >
                            {selected && <CheckIcon size={13} weight="bold" />}
                            {selected ? t("room.selected") : t("room.selectButton")}
                        </button>
                        <button type="button" className={styles.bookNowButton} onClick={bookNow}>
                            {t("room.bookNow")}
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
