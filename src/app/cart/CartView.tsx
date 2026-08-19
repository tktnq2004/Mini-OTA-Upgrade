"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ROOM_TYPE_LABELS, formatVnd } from "@/data/rooms.data";
import { formatDateVn, nightsBetween } from "@/lib/searchFilters";
import { cartGrandTotal, findRoomForItem, groupCartItemsByHotel, cartLineTotal } from "@/components/cart/cartUtils";
import controls from "@/styles/controls.module.css";
import styles from "./cart.module.css";

export default function CartView() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { items, removeItem, setQuantity } = useCart();

    const groups = groupCartItemsByHotel(items);
    const grandTotal = cartGrandTotal(items);

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
                                            const room = findRoomForItem(item);
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
                                                        {formatVnd(cartLineTotal(room, item))}
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
                            <button
                                type="button"
                                className={controls.button}
                                onClick={() => router.push("/checkout")}
                            >
                                {t("cart.proceedToBook")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
