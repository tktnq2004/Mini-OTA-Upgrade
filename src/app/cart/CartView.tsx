"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
    ShoppingBagIcon,
    BuildingsIcon,
    BedIcon,
    TrashIcon,
    MapPinIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import Stepper from "@/components/Stepper/Stepper";
import { useCart } from "@/components/cart/CartProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { hotels, type Hotel } from "@/data/hotels.data";
import { ROOM_TYPE_LABELS, formatVnd, generateRoomsForHotel, type Room } from "@/data/rooms.data";
import { formatDateVn, nightsBetween } from "@/lib/searchFilters";
import type { CartItem } from "@/components/cart/cartStorage";
import controls from "@/styles/controls.module.css";
import styles from "./cart.module.css";

interface HotelGroup {
    hotel: Hotel;
    items: CartItem[];
}

function lineTotal(room: Room, item: CartItem): number {
    return room.price * item.quantity * nightsBetween(item.checkin, item.checkout);
}

export default function CartView() {
    const { t, language } = useLanguage();
    const { items, removeItem, setQuantity } = useCart();

    const groups = useMemo<HotelGroup[]>(() => {
        const byHotel = new Map<number, CartItem[]>();
        for (const item of items) {
            const list = byHotel.get(item.hotelId) ?? [];
            list.push(item);
            byHotel.set(item.hotelId, list);
        }
        const result: HotelGroup[] = [];
        for (const [hotelId, hotelItems] of byHotel) {
            const hotel = hotels.find((h) => h.id === hotelId);
            if (hotel) result.push({ hotel, items: hotelItems });
        }
        return result;
    }, [items]);

    const grandTotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const room = generateRoomsForHotel(item.hotelId).find((r) => r.id === item.roomId);
            return room ? sum + lineTotal(room, item) : sum;
        }, 0);
    }, [items]);

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <div className={styles.header}>
                    <h1>{t("cart.title")}</h1>
                    <p>{t("cart.subtitle")}</p>
                </div>

                {groups.length === 0 ? (
                    <div className={styles.emptyState}>
                        <ShoppingBagIcon size={32} weight="light" />
                        <p>{t("cart.empty")}</p>
                        <Link href="/" className={controls.button}>
                            {t("cart.emptyCta")}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className={styles.groups}>
                            {groups.map(({ hotel, items: hotelItems }) => (
                                <section key={hotel.id} className={styles.hotelGroup}>
                                    <div className={styles.hotelHead}>
                                        <ImageWithFallback
                                            src={hotel.thumbnail}
                                            alt={hotel.name}
                                            className={styles.hotelThumb}
                                            fallbackClassName={styles.hotelThumbFallback}
                                            fallback={<BuildingsIcon size={20} weight="light" />}
                                        />
                                        <div className={styles.hotelInfo}>
                                            <h2>{hotel.name}</h2>
                                            <p>
                                                <MapPinIcon size={12} />
                                                <span>{hotel.address}</span>
                                            </p>
                                        </div>
                                        <Link href={`/hotel/${hotel.id}`} className={styles.viewHotelLink}>
                                            {t("cart.viewHotel")}
                                        </Link>
                                    </div>

                                    <ul className={styles.roomList}>
                                        {hotelItems.map((item) => {
                                            const room = generateRoomsForHotel(item.hotelId).find(
                                                (r) => r.id === item.roomId
                                            );
                                            if (!room) return null;
                                            const nights = nightsBetween(item.checkin, item.checkout);

                                            return (
                                                <li key={item.roomId} className={styles.roomRow}>
                                                    <ImageWithFallback
                                                        src={room.thumbnail}
                                                        alt={room.name}
                                                        className={styles.roomThumb}
                                                        fallbackClassName={styles.roomThumbFallback}
                                                        fallback={<BedIcon size={18} weight="light" />}
                                                    />

                                                    <div className={styles.roomInfo}>
                                                        <span className={styles.roomType}>
                                                            {ROOM_TYPE_LABELS[room.roomType]}
                                                        </span>
                                                        <span className={styles.roomName}>{room.name}</span>
                                                        <span className={styles.roomDates}>
                                                            {formatDateVn(item.checkin, language)} –{" "}
                                                            {formatDateVn(item.checkout, language)} ·{" "}
                                                            {t("hotel.nightsSuffix", { count: nights })} ·{" "}
                                                            {t("search.guestsValue", { count: item.guests })}
                                                        </span>
                                                    </div>

                                                    <Stepper
                                                        value={item.quantity}
                                                        min={1}
                                                        max={10}
                                                        onChange={(v) => setQuantity(item.hotelId, item.roomId, v)}
                                                        ariaLabel={room.name}
                                                    />

                                                    <div className={styles.roomPrice}>
                                                        {formatVnd(lineTotal(room, item))}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className={styles.removeButton}
                                                        onClick={() => removeItem(item.hotelId, item.roomId)}
                                                        aria-label={t("cart.remove")}
                                                    >
                                                        <TrashIcon size={15} />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        <div className={styles.summary}>
                            <span className={styles.summaryLabel}>{t("cart.summaryTotal")}</span>
                            <strong className={styles.summaryTotal}>{formatVnd(grandTotal)}</strong>
                            <button type="button" className={controls.button}>
                                {t("cart.proceedToBook")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
