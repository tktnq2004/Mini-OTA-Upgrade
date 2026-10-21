"use client";

import { BedIcon, BuildingsIcon, MapPinIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import type { StayQuote } from "@/lib/booking/discount";
import type { Hotel, Room } from "@/lib/hotels/types";
import styles from "./checkout.module.css";

interface OrderSummaryProps {
    hotel: Hotel;
    stay: StayQuote<Room>;
    nights: number;
}

// "Tóm tắt đơn" ở cột phải trang /checkout: khách sạn, từng phòng (giá xem
// trước sau khuyến mãi), tạm tính / khuyến mãi / tổng cộng. Số tiền THẬT do
// backend chốt lúc tạo booking (trang payment hiện số đó).
export default function OrderSummary({ hotel, stay, nights }: OrderSummaryProps) {
    const { t } = useLanguage();

    return (
        <>
            <h2 className={styles.summaryHeading}>{t("checkout.orderSummaryTitle")}</h2>

            <div className={styles.summaryHotelGroup}>
                <div className={styles.summaryHotelHead}>
                    <ImageWithFallback
                        src={hotel.image}
                        alt={hotel.name}
                        className={styles.summaryHotelThumb}
                        fallbackClassName={styles.summaryHotelThumbFallback}
                        fallback={<BuildingsIcon size={16} weight="light" />}
                    />
                    <div className={styles.summaryHotelText}>
                        <span className={styles.summaryHotelName}>{hotel.name}</span>
                        <span className={styles.summaryHotelAddress}>
                            <MapPinIcon size={11} />
                            <span>{hotel.address}</span>
                        </span>
                    </div>
                </div>

                {stay.rooms.map(({ room, quote }) => (
                    <div key={room.id} className={styles.summaryRoomRow}>
                        <ImageWithFallback
                            src={room.thumbnail}
                            alt={room.name}
                            className={styles.summaryRoomThumb}
                            fallbackClassName={styles.summaryRoomThumbFallback}
                            fallback={<BedIcon size={14} weight="light" />}
                        />
                        <div className={styles.summaryRoomInfo}>
                            <span className={styles.summaryRoomName}>
                                {room.roomType ? `${room.roomType.roomTypeName} · ` : ""}
                                {room.name}
                            </span>
                            <span className={styles.summaryRoomMeta}>
                                {nights > 0
                                    ? `${formatVnd(room.price)} × ${t("hotel.nightsSuffix", { count: nights })}`
                                    : `${formatVnd(room.price)} ${t("room.perNight")}`}
                            </span>
                            {quote?.applied.map((a) => (
                                <span key={a.discount.id} className={styles.summaryRoomDiscount}>
                                    <DiscountTag discount={a.discount} />
                                    <span>
                                        {t("hotel.nightsSuffix", { count: a.nights })} · -{formatVnd(a.amount)}
                                    </span>
                                </span>
                            ))}
                        </div>
                        <span className={styles.summaryRoomPrice}>
                            {quote && quote.discountAmount > 0 && (
                                <s className={styles.summaryRoomPriceOriginal}>{formatVnd(quote.subtotal)}</s>
                            )}
                            {quote ? formatVnd(quote.total) : "—"}
                        </span>
                    </div>
                ))}
            </div>

            {stay.discountTotal > 0 && (
                <div className={styles.summaryDiscountRows}>
                    <div>
                        <span>{t("discount.subtotal")}</span>
                        <span>{formatVnd(stay.subtotal)}</span>
                    </div>
                    <div className={styles.summaryDiscountAmount}>
                        <span>{t("discount.totalDiscount")}</span>
                        <span>-{formatVnd(stay.discountTotal)}</span>
                    </div>
                </div>
            )}

            <div className={styles.summaryTotalRow}>
                <span>{t("wishlist.summaryTotal")}</span>
                <strong>{nights > 0 ? formatVnd(stay.total) : t("checkout.pickDatesForTotal")}</strong>
            </div>
            {stay.discountTotal > 0 && <p className={styles.summaryDiscountNote}>{t("discount.previewNote")}</p>}
        </>
    );
}
