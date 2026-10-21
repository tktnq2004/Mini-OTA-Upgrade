"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedIcon, UsersIcon, CheckIcon } from "@phosphor-icons/react";
import type { Room } from "@/lib/hotels/types";
import { formatVnd } from "@/lib/format";
import { nightReduction, quoteRoom } from "@/lib/booking/discount";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
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
    // Giá xem trước sau khuyến mãi cho đúng kỳ ở đang chọn — số thật do
    // backend chốt lúc tạo booking (xem lib/booking/discount.ts).
    const quote = quoteRoom(room, checkin, checkout);
    const headline = quote.applied[0] ?? null;
    const discountedNights = quote.applied.reduce((sum, a) => sum + a.nights, 0);
    const nightlyPrice = headline ? room.price - nightReduction(room.price, headline.discount) : room.price;
    const total = quote.nights > 0 ? quote.total : room.price * nights;
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
                {headline && <DiscountTag discount={headline.discount} compact className={styles.discountBadge} />}
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

                {headline && (
                    <div className={styles.discountRow}>
                        <DiscountTag discount={headline.discount} />
                    </div>
                )}

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
                        {headline && <s className={styles.priceOriginal}>{formatVnd(room.price)}</s>}
                        <div>
                            <strong>{formatVnd(nightlyPrice)}</strong>
                            <span> {t("room.perNight")}</span>
                        </div>
                        {nights > 1 && (
                            <span className={styles.priceTotal}>
                                {t("room.totalForNights", { total: formatVnd(total), count: nights })}
                                {headline && discountedNights < quote.nights && (
                                    <> · {t("discount.partialNights", { count: discountedNights, total: quote.nights })}</>
                                )}
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
