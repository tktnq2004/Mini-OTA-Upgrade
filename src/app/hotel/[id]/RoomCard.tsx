"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedIcon, UsersIcon, CheckIcon } from "@phosphor-icons/react";
import type { Room } from "@/lib/hotels/types";
import { formatVnd } from "@/lib/format";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import styles from "./RoomCard.module.css";

const VISIBLE_AMENITIES = 4;

interface RoomCardProps {
    hotelId: number;
    room: Room;
    // Ảnh đại diện thật từ module media (R2) — ưu tiên hơn room.thumbnail cũ
    // khi room này đã có ảnh admin upload (xem HotelDetail/RoomDetailView).
    coverImage?: string;
    nights: number;
    checkin: string;
    checkout: string;
    guests: number;
}

export default function RoomCard({ hotelId, room, coverImage, nights, checkin, checkout, guests }: RoomCardProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { isSaved, add, remove } = useWishlist();
    const selected = isSaved(hotelId, room.id);
    const visibleAmenities = room.amenities.slice(0, VISIBLE_AMENITIES);
    const extraCount = room.amenities.length - visibleAmenities.length;
    const total = room.price * nights;
    const detailHref = `/hotel/${hotelId}/room/${room.id}?${new URLSearchParams({
        checkin,
        checkout,
        guests: String(guests),
    }).toString()}`;

    const toggleWishlist = () => {
        if (selected) {
            remove(hotelId, room.id);
        } else {
            add(hotelId, room.id);
        }
    };

    const bookNow = () => {
        // Ngày/số khách chỉ là gợi ý điền sẵn — người dùng chốt lại ở /checkout
        // (nơi có picker biết ngày nào đã kín). from=hotel để nút "Quay lại"
        // của checkout về đúng trang khách sạn.
        const params = new URLSearchParams({
            hotelId: String(hotelId),
            roomIds: String(room.id),
            from: "hotel",
            checkin,
            checkout,
            guests: String(guests),
        });
        router.push(`/checkout?${params.toString()}`);
    };

    return (
        <article className={styles.card}>
            <Link href={detailHref} className={styles.thumbWrap}>
                <ImageWithFallback
                    src={coverImage ?? room.thumbnail}
                    alt={room.name}
                    className={styles.thumb}
                    fallbackClassName={styles.thumbFallback}
                    fallback={<BedIcon size={22} weight="light" />}
                />
                {room.roomType && <span className={styles.typeBadge}>{room.roomType.roomTypeName}</span>}
            </Link>

            <div className={styles.body}>
                <Link href={detailHref} className={styles.nameLink}>
                    <h3 className={styles.name}>{room.name}</h3>
                </Link>

                <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                        <UsersIcon size={14} /> {t("room.maxGuests", { count: room.capacity })}
                    </span>
                </div>

                <ul className={styles.amenities}>
                    {visibleAmenities.map((a) => (
                        <li key={a.id} className={styles.amenity}>
                            <CheckIcon size={12} weight="bold" />
                            {a.name}
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
                            onClick={toggleWishlist}
                        >
                            {selected && <CheckIcon size={13} weight="bold" />}
                            {selected ? t("room.savedToWishlist") : t("room.saveToWishlist")}
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
