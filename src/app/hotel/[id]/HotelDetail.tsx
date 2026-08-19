"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    MapPinIcon,
    CalendarBlankIcon,
    SlidersHorizontalIcon,
    ArrowLeftIcon,
    BuildingsIcon,
    SmileyMehIcon,
} from "@phosphor-icons/react";
import type { Hotel } from "@/data/hotels.data";
import {
    ROOM_TYPES,
    ROOM_TYPE_LABELS,
    formatVnd,
    generateRoomsForHotel,
    type RoomType,
} from "@/data/rooms.data";
import {
    addDaysIso,
    defaultFilters,
    formatDateVn,
    nightsBetween,
    parseFilters,
    todayIso,
} from "@/lib/searchFilters";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import Stepper from "@/components/Stepper/Stepper";
import Pagination from "@/components/Pagination/Pagination";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import RoomCard from "./RoomCard";
import controls from "@/styles/controls.module.css";
import styles from "./HotelDetail.module.css";

const PAGE_SIZE = 12;
const PRICE_CEILING = 5_000_000;

interface HotelDetailProps {
    hotel: Hotel;
}

export default function HotelDetail({ hotel }: HotelDetailProps) {
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();
    // Chỉ đọc query string một lần lúc vào trang để khởi tạo bộ lọc — sau đó
    // bộ lọc trên trang khách sạn do người dùng tự điều khiển tại đây.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const initial = useMemo(() => parseFilters(searchParams), []);
    const backHref = `/map?${searchParams.toString()}`;

    const rooms = useMemo(() => generateRoomsForHotel(hotel.id), [hotel.id]);

    const [checkin, setCheckin] = useState(initial.checkin);
    const [checkout, setCheckout] = useState(initial.checkout);
    const [guests, setGuests] = useState(initial.guests);
    const [roomType, setRoomType] = useState<"all" | RoomType>("all");
    const [maxPrice, setMaxPrice] = useState(PRICE_CEILING);
    const [page, setPage] = useState(1);

    const nights = nightsBetween(checkin, checkout);
    const minCheckin = todayIso();
    const minCheckout = addDaysIso(checkin || minCheckin, 1);

    const handleCheckinChange = (value: string) => {
        setCheckin(value);
        if (checkout && checkout <= value) {
            setCheckout(addDaysIso(value, 1));
        }
    };

    const filteredRooms = useMemo(() => {
        return rooms.filter((room) => {
            if (roomType !== "all" && room.roomType !== roomType) return false;
            if (maxPrice < PRICE_CEILING && room.price > maxPrice) return false;
            if (room.capacity < guests) return false;
            return true;
        });
    }, [rooms, roomType, maxPrice, guests]);

    // Về trang 1 mỗi khi bộ lọc đổi — điều chỉnh state ngay trong lúc render
    // (theo khuyến nghị của React) thay vì dùng effect để tránh một nhịp
    // render thừa và cảnh báo set-state-in-effect.
    const filterSignature = [roomType, maxPrice, guests].join("|");
    const [lastFilterSignature, setLastFilterSignature] = useState(filterSignature);
    if (filterSignature !== lastFilterSignature) {
        setLastFilterSignature(filterSignature);
        setPage(1);
    }

    const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRooms = filteredRooms.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const defaultGuests = defaultFilters().guests;
    const hasActiveFilters =
        roomType !== "all" || maxPrice < PRICE_CEILING || guests !== defaultGuests;

    const resetFilters = () => {
        setRoomType("all");
        setMaxPrice(PRICE_CEILING);
        setGuests(defaultGuests);
    };

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <aside className={styles.infoPanel}>
                    <Link href={backHref} className={styles.backLink}>
                        <ArrowLeftIcon size={14} weight="bold" /> {t("hotel.backToMap")}
                    </Link>

                    <ImageWithFallback
                        src={hotel.thumbnail}
                        alt={hotel.name}
                        className={styles.thumb}
                        fallbackClassName={styles.thumbFallback}
                        fallback={<BuildingsIcon size={28} weight="light" />}
                    />

                    <div className={styles.identity}>
                        <h1 className={styles.name}>{hotel.name}</h1>
                        <p className={styles.address}>
                            <MapPinIcon size={14} />
                            <span>{hotel.address}</span>
                        </p>
                    </div>

                    <div className={styles.filterCard}>
                        <h2 className={styles.filterHeading}>
                            <SlidersHorizontalIcon size={16} weight="bold" />
                            {t("hotel.filterHeading")}
                        </h2>

                        <div className={styles.dateRow}>
                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="hd-checkin">
                                    <CalendarBlankIcon size={13} weight="bold" /> {t("search.checkinLabel")}
                                </label>
                                <input
                                    id="hd-checkin"
                                    type="date"
                                    className={controls.input}
                                    value={checkin}
                                    min={minCheckin}
                                    onChange={(e) => handleCheckinChange(e.target.value)}
                                />
                            </div>
                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="hd-checkout">
                                    <CalendarBlankIcon size={13} weight="bold" /> {t("search.checkoutLabel")}
                                </label>
                                <input
                                    id="hd-checkout"
                                    type="date"
                                    className={controls.input}
                                    value={checkout}
                                    min={minCheckout}
                                    onChange={(e) => setCheckout(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="hd-roomtype">
                                {t("hotel.roomTypeLabel")}
                            </label>
                            <select
                                id="hd-roomtype"
                                className={controls.select}
                                value={roomType}
                                onChange={(e) => setRoomType(e.target.value as "all" | RoomType)}
                            >
                                <option value="all">{t("hotel.roomTypeAllOption")}</option>
                                {ROOM_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {ROOM_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={controls.field}>
                            <div className={styles.priceLabelRow}>
                                <span className={controls.label}>{t("hotel.maxPriceLabel")}</span>
                                <span className={styles.priceValue}>
                                    {maxPrice >= PRICE_CEILING ? t("hotel.unlimitedPrice") : formatVnd(maxPrice)}
                                </span>
                            </div>
                            <input
                                type="range"
                                className={styles.priceSlider}
                                min={0}
                                max={PRICE_CEILING}
                                step={100000}
                                value={maxPrice}
                                style={{
                                    background: `linear-gradient(to right, var(--color-accent) ${(maxPrice / PRICE_CEILING) * 100
                                        }%, var(--color-border) ${(maxPrice / PRICE_CEILING) * 100}%)`,
                                }}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                aria-label={t("hotel.maxPriceAriaLabel")}
                            />
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label}>{t("search.guestsLabel")}</label>
                            <Stepper
                                value={guests}
                                min={1}
                                max={10}
                                onChange={setGuests}
                                formatValue={(v) => t("search.guestsValue", { count: v })}
                                ariaLabel={t("search.guestsLabel")}
                            />
                        </div>

                        {hasActiveFilters && (
                            <button type="button" className={styles.resetButton} onClick={resetFilters}>
                                {t("hotel.resetFilters")}
                            </button>
                        )}
                    </div>
                </aside>

                <section className={styles.roomsPanel}>
                    <div className={styles.roomsHeader}>
                        <h2>{t("hotel.roomsFound", { count: filteredRooms.length })}</h2>
                        <p>
                            {formatDateVn(checkin, language)} – {formatDateVn(checkout, language)} ·{" "}
                            {t("hotel.nightsSuffix", { count: nights })} ·{" "}
                            {t("search.guestsValue", { count: guests })}
                        </p>
                    </div>

                    {pageRooms.length > 0 ? (
                        <div className={styles.roomsGrid}>
                            {pageRooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    nights={nights}
                                    checkin={checkin}
                                    checkout={checkout}
                                    guests={guests}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <SmileyMehIcon size={24} weight="light" />
                            <p>{t("hotel.emptyState")}</p>
                            <button type="button" className={styles.resetButton} onClick={resetFilters}>
                                {t("hotel.resetFilters")}
                            </button>
                        </div>
                    )}

                    <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
                </section>
            </div>
        </div>
    );
}
