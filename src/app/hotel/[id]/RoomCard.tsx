"use client";

import { BedIcon, UsersIcon, ArrowsOutIcon, CheckIcon } from "@phosphor-icons/react";
import { ROOM_TYPE_LABELS, formatVnd, type Room } from "@/data/rooms.data";
import ImageWithFallback from "@/components/ImageWithFallback";
import styles from "./RoomCard.module.css";

const VISIBLE_AMENITIES = 4;

interface RoomCardProps {
    room: Room;
    nights: number;
}

export default function RoomCard({ room, nights }: RoomCardProps) {
    const visibleAmenities = room.amenities.slice(0, VISIBLE_AMENITIES);
    const extraCount = room.amenities.length - visibleAmenities.length;
    const total = room.price * nights;

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
                        <UsersIcon size={14} /> Tối đa {room.capacity} khách
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
                    {extraCount > 0 && <li className={styles.amenityMore}>+{extraCount} tiện ích</li>}
                </ul>

                <div className={styles.footer}>
                    <div className={styles.price}>
                        <strong>{formatVnd(room.price)}</strong>
                        <span> /đêm</span>
                        {nights > 1 && (
                            <span className={styles.priceTotal}>
                                {formatVnd(total)} cho {nights} đêm
                            </span>
                        )}
                    </div>
                    <button type="button" className={styles.selectButton}>
                        Chọn phòng
                    </button>
                </div>
            </div>
        </article>
    );
}
