"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeftIcon,
    MapPinIcon,
    UsersIcon,
    ArrowsOutIcon,
    CheckIcon,
    ClockIcon,
    ShieldCheckIcon,
    IdentificationCardIcon,
    ProhibitIcon,
    BuildingsIcon,
    CalendarBlankIcon,
    BedIcon,
} from "@phosphor-icons/react";
import type { Hotel } from "@/data/hotels.data";
import {
    ROOM_TYPE_LABELS,
    formatVnd,
    generateRoomsForHotel,
    getRoomGallery,
    getRoomDescription,
    type Room,
} from "@/data/rooms.data";
import { addDaysIso, nightsBetween, parseFilters, todayIso } from "@/lib/searchFilters";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import Stepper from "@/components/Stepper/Stepper";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCart } from "@/components/cart/CartProvider";
import RoomCard from "../../RoomCard";
import controls from "@/styles/controls.module.css";
import styles from "./RoomDetail.module.css";

interface RoomDetailViewProps {
    hotel: Hotel;
    room: Room;
}

export default function RoomDetailView({ hotel, room }: RoomDetailViewProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isInCart, addItem, removeItem } = useCart();

    // Chỉ đọc query string một lần lúc vào trang để khởi tạo ngày/số khách —
    // sau đó người dùng tự điều chỉnh ngay tại đây (giống HotelDetail).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const initial = useMemo(() => parseFilters(searchParams), []);

    const [checkin, setCheckin] = useState(initial.checkin);
    const [checkout, setCheckout] = useState(initial.checkout);
    const [guests, setGuests] = useState(() => Math.min(initial.guests, room.capacity));
    const [activePhoto, setActivePhoto] = useState(0);

    const gallery = useMemo(() => getRoomGallery(room), [room]);
    const description = useMemo(() => getRoomDescription(room), [room]);
    const otherRooms = useMemo(
        () => generateRoomsForHotel(hotel.id).filter((r) => r.id !== room.id).slice(0, 4),
        [hotel.id, room.id]
    );

    const nights = nightsBetween(checkin, checkout);
    const total = room.price * nights;
    const minCheckin = todayIso();
    const minCheckout = addDaysIso(checkin || minCheckin, 1);
    const selected = isInCart(room.hotelId, room.id);
    const hotelHref = `/hotel/${hotel.id}?${searchParams.toString()}`;

    const handleCheckinChange = (value: string) => {
        setCheckin(value);
        if (checkout && checkout <= value) {
            setCheckout(addDaysIso(value, 1));
        }
    };

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
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <div className={styles.mainColumn}>
                    <Link href={hotelHref} className={styles.backLink}>
                        <ArrowLeftIcon size={14} weight="bold" /> {t("room.detail.backToHotel")}
                    </Link>

                    <div className={styles.gallery}>
                        <div className={styles.heroWrap}>
                            <ImageWithFallback
                                src={gallery[activePhoto]}
                                alt={room.name}
                                className={styles.hero}
                                fallbackClassName={styles.heroFallback}
                                fallback={<BedIcon size={32} weight="light" />}
                                loading="eager"
                            />
                        </div>
                        {gallery.length > 1 && (
                            <div className={styles.thumbRow}>
                                {gallery.map((src, i) => (
                                    <button
                                        key={src}
                                        type="button"
                                        className={i === activePhoto ? styles.thumbBtnActive : styles.thumbBtn}
                                        onClick={() => setActivePhoto(i)}
                                        aria-label={`${t("room.detail.photoAria")} ${i + 1}`}
                                    >
                                        <ImageWithFallback
                                            src={src}
                                            alt=""
                                            className={styles.thumbImg}
                                            fallbackClassName={styles.thumbImgFallback}
                                            fallback={<BedIcon size={14} weight="light" />}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.titleBlock}>
                        <span className={styles.typeBadge}>{ROOM_TYPE_LABELS[room.roomType]}</span>
                        <h1 className={styles.title}>{room.name}</h1>
                        <Link href={hotelHref} className={styles.hotelLink}>
                            <BuildingsIcon size={14} /> {hotel.name}
                        </Link>
                        <p className={styles.address}>
                            <MapPinIcon size={13} />
                            <span>{hotel.address}</span>
                        </p>
                        <div className={styles.metaRow}>
                            <span className={styles.metaItem}>
                                <UsersIcon size={15} /> {t("room.maxGuests", { count: room.capacity })}
                            </span>
                            <span className={styles.metaItem}>
                                <ArrowsOutIcon size={15} /> {room.sizeSqm} m²
                            </span>
                        </div>
                    </div>

                    <section className={styles.section}>
                        <h2>{t("room.detail.descriptionTitle")}</h2>
                        <p className={styles.description}>{description}</p>
                    </section>

                    <section className={styles.section}>
                        <h2>{t("room.detail.amenitiesTitle")}</h2>
                        <div className={styles.amenitiesGrid}>
                            {room.amenities.map((a) => (
                                <span key={a} className={styles.amenityItem}>
                                    <CheckIcon size={13} weight="bold" />
                                    {a}
                                </span>
                            ))}
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2>{t("room.detail.policiesTitle")}</h2>
                        <ul className={styles.policyList}>
                            <li>
                                <ClockIcon size={15} /> {t("room.detail.policyCheckin")}
                            </li>
                            <li>
                                <ClockIcon size={15} /> {t("room.detail.policyCheckout")}
                            </li>
                            <li>
                                <ShieldCheckIcon size={15} /> {t("room.detail.policyCancellation")}
                            </li>
                            <li>
                                <IdentificationCardIcon size={15} /> {t("room.detail.policyId")}
                            </li>
                            <li>
                                <ProhibitIcon size={15} /> {t("room.detail.policySmoking")}
                            </li>
                        </ul>
                    </section>

                    {otherRooms.length > 0 && (
                        <section className={styles.section}>
                            <h2>{t("room.detail.otherRoomsTitle")}</h2>
                            <div className={styles.otherRoomsGrid}>
                                {otherRooms.map((r) => (
                                    <RoomCard
                                        key={r.id}
                                        room={r}
                                        nights={nights}
                                        checkin={checkin}
                                        checkout={checkout}
                                        guests={guests}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <aside className={styles.bookingColumn}>
                    <div className={styles.bookingCard}>
                        <div className={styles.priceHead}>
                            <strong>{formatVnd(room.price)}</strong>
                            <span>{t("room.perNight")}</span>
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="rd-checkin">
                                <CalendarBlankIcon size={13} weight="bold" /> {t("search.checkinLabel")}
                            </label>
                            <input
                                id="rd-checkin"
                                type="date"
                                className={controls.input}
                                value={checkin}
                                min={minCheckin}
                                onChange={(e) => handleCheckinChange(e.target.value)}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="rd-checkout">
                                <CalendarBlankIcon size={13} weight="bold" /> {t("search.checkoutLabel")}
                            </label>
                            <input
                                id="rd-checkout"
                                type="date"
                                className={controls.input}
                                value={checkout}
                                min={minCheckout}
                                onChange={(e) => setCheckout(e.target.value)}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>{t("search.guestsLabel")}</label>
                            <Stepper
                                value={guests}
                                min={1}
                                max={room.capacity}
                                onChange={setGuests}
                                formatValue={(v) => t("search.guestsValue", { count: v })}
                                ariaLabel={t("search.guestsLabel")}
                            />
                        </div>

                        <div className={styles.priceBreakdown}>
                            <span>{t("hotel.nightsSuffix", { count: nights })}</span>
                            <strong>{formatVnd(total)}</strong>
                        </div>

                        <div className={styles.bookingActions}>
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
                </aside>
            </div>
        </div>
    );
}
