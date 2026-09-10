"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeftIcon,
    BuildingsIcon,
    BedIcon,
    MapPinIcon,
    CalendarBlankIcon,
    UsersIcon,
    CreditCardIcon,
    HandCoinsIcon,
    CheckCircleIcon,
    ShoppingBagIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import DateRangeField from "@/components/DateRangePicker/DateRangeField";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import { getHotel } from "@/lib/hotels/client";
import type { Hotel, Room } from "@/lib/hotels/types";
import { nightsBetween } from "@/lib/searchFilters";
import { getUnavailableDates } from "@/lib/booking/availability";
import { createBooking, type PaymentMethod } from "@/lib/booking/client";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";

export default function CheckoutView() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const { remove: removeFromWishlist } = useWishlist();

    // 1 lần đặt = 1 khách sạn + N phòng của khách sạn đó (xem quyết định 3a).
    // Đọc từ query: ?hotelId=..&roomIds=1,2,3  (tương thích ngược: ?roomId=1).
    const hotelId = Number(searchParams.get("hotelId")) || null;
    const roomIds = useMemo(() => {
        const csv = searchParams.get("roomIds");
        const single = searchParams.get("roomId");
        const raw = csv ? csv.split(",") : single ? [single] : [];
        return Array.from(new Set(raw.map(Number).filter((n) => Number.isFinite(n) && n > 0)));
    }, [searchParams]);
    const cameFromHotel = searchParams.get("from") === "hotel";
    const backHref = cameFromHotel && hotelId ? `/hotel/${hotelId}` : "/wishlist";

    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [loadingHotel, setLoadingHotel] = useState(Boolean(hotelId));

    useEffect(() => {
        if (!hotelId) return;
        let alive = true;
        getHotel(hotelId)
            .then((h) => {
                if (alive) setHotel(h);
            })
            .catch(() => {
                if (alive) setHotel(null);
            })
            .finally(() => {
                if (alive) setLoadingHotel(false);
            });
        return () => {
            alive = false;
        };
    }, [hotelId]);

    const rooms: Room[] = useMemo(() => {
        if (!hotel?.rooms) return [];
        return roomIds
            .map((id) => hotel.rooms!.find((r) => r.id === id))
            .filter((r): r is Room => Boolean(r));
    }, [hotel, roomIds]);

    // ----- Ngày nhận / trả (chọn Ở ĐÂY, không phải ở wishlist) -----
    const [checkIn, setCheckIn] = useState<string | null>(searchParams.get("checkin"));
    const [checkOut, setCheckOut] = useState<string | null>(searchParams.get("checkout"));
    const [guests, setGuests] = useState(() => Number(searchParams.get("guests")) || 2);

    const [unavailable, setUnavailable] = useState<string[]>([]);
    const [loadingDates, setLoadingDates] = useState(true);

    useEffect(() => {
        if (!hotelId || roomIds.length === 0) return;
        let alive = true;
        // TODO(backend): getUnavailableDates hiện trả rỗng — khi có API, các
        // ngày đã kín sẽ tự bị bôi xám trong DateRangePicker.
        getUnavailableDates(hotelId, roomIds)
            .then((days) => {
                if (alive) setUnavailable(days);
            })
            .finally(() => {
                if (alive) setLoadingDates(false);
            });
        return () => {
            alive = false;
        };
    }, [hotelId, roomIds]);

    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
    const roomsSubtotal = rooms.reduce((sum, r) => sum + r.price, 0);
    const grandTotal = nights > 0 ? roomsSubtotal * nights : 0;

    // ----- Thông tin khách + thanh toán -----
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("payAtHotel");
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<{ code: string; rooms: number; total: number } | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!checkIn || !checkOut) {
            setError(t("checkout.errorDates"));
            return;
        }
        if (!fullName || !email || !phone) {
            setError(t("checkout.errorRequired"));
            return;
        }
        if (paymentMethod === "card" && (!cardNumber || !cardName || !cardExpiry || !cardCvv)) {
            setError(t("checkout.errorCardRequired"));
            return;
        }
        if (!hotelId || rooms.length === 0) return;

        setSubmitting(true);
        try {
            const result = await createBooking({
                hotelId,
                roomIds: rooms.map((r) => r.id),
                checkIn,
                checkOut,
                guests,
                guest: { fullName, email, phone, note: note || undefined },
                payment: {
                    method: paymentMethod,
                    card:
                        paymentMethod === "card"
                            ? { number: cardNumber, name: cardName, expiry: cardExpiry, cvv: cardCvv }
                            : undefined,
                },
            });
            // Đặt xong thì bỏ các phòng vừa đặt khỏi wishlist (nếu có).
            rooms.forEach((r) => removeFromWishlist(hotelId, r.id));
            setOrder({ code: result.code, rooms: rooms.length, total: grandTotal });
        } catch {
            setError(t("checkout.errorSubmit"));
        } finally {
            setSubmitting(false);
        }
    };

    if (order) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.successLayout}>
                    <div className={styles.successCard}>
                        <CheckCircleIcon size={40} weight="fill" className={styles.successIcon} />
                        <h1>{t("checkout.successTitle")}</h1>
                        <p>{t("checkout.successSubtitle", { code: order.code })}</p>
                        <div className={styles.successSummary}>
                            <span>{t("checkout.roomsBooked", { count: order.rooms })}</span>
                            <strong>{formatVnd(order.total)}</strong>
                        </div>
                        <Link href="/" className={controls.button}>
                            {t("checkout.backHome")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loadingHotel) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout}>
                    <p className={styles.emptyState}>{t("wishlist.loading")}</p>
                </div>
            </div>
        );
    }

    if (!hotel || rooms.length === 0) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout}>
                    <div className={styles.emptyState}>
                        <ShoppingBagIcon size={32} weight="light" />
                        <p>{t("checkout.nothingToBook")}</p>
                        <Link href="/wishlist" className={controls.button}>
                            {t("checkout.backToWishlist")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <Link href={backHref} className={styles.backLink}>
                    <ArrowLeftIcon size={14} weight="bold" />
                    {cameFromHotel ? t("checkout.backToHotel") : t("checkout.backToWishlist")}
                </Link>

                <h1 className={styles.title}>{t("checkout.title")}</h1>

                <form className={styles.grid} onSubmit={handleSubmit}>
                    <div className={styles.formColumn}>
                        <section className={styles.formSection}>
                            <h2>{t("checkout.customerInfoTitle")}</h2>
                            <p className={styles.sectionHint}>{t("checkout.customerInfoHint")}</p>

                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="co-name">
                                    {t("auth.fullNameLabel")}
                                </label>
                                <input
                                    id="co-name"
                                    type="text"
                                    className={controls.input}
                                    placeholder={t("auth.fullNamePlaceholder")}
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div className={styles.fieldRow}>
                                <div className={controls.field}>
                                    <label className={controls.label} htmlFor="co-email">
                                        Email
                                    </label>
                                    <input
                                        id="co-email"
                                        type="email"
                                        className={controls.input}
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className={controls.field}>
                                    <label className={controls.label} htmlFor="co-phone">
                                        {t("auth.phoneLabel")}
                                    </label>
                                    <input
                                        id="co-phone"
                                        type="tel"
                                        className={controls.input}
                                        placeholder="09xx xxx xxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="co-note">
                                    {t("checkout.noteLabel")}
                                </label>
                                <textarea
                                    id="co-note"
                                    className={controls.textarea}
                                    placeholder={t("checkout.notePlaceholder")}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                        </section>

                        <section className={styles.formSection}>
                            <h2>{t("checkout.paymentTitle")}</h2>

                            <div className={styles.paymentOptions}>
                                <label
                                    className={`${styles.paymentOption} ${paymentMethod === "payAtHotel" ? styles.paymentOptionActive : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        checked={paymentMethod === "payAtHotel"}
                                        onChange={() => setPaymentMethod("payAtHotel")}
                                    />
                                    <HandCoinsIcon size={18} />
                                    <span>{t("checkout.payAtHotel")}</span>
                                </label>
                                <label
                                    className={`${styles.paymentOption} ${paymentMethod === "card" ? styles.paymentOptionActive : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        checked={paymentMethod === "card"}
                                        onChange={() => setPaymentMethod("card")}
                                    />
                                    <CreditCardIcon size={18} />
                                    <span>{t("checkout.payByCard")}</span>
                                </label>
                            </div>

                            {paymentMethod === "card" && (
                                <div className={styles.cardFields}>
                                    <div className={controls.field}>
                                        <label className={controls.label} htmlFor="co-card-number">
                                            {t("checkout.cardNumber")}
                                        </label>
                                        <input
                                            id="co-card-number"
                                            type="text"
                                            inputMode="numeric"
                                            className={controls.input}
                                            placeholder="4242 4242 4242 4242"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                        />
                                    </div>
                                    <div className={controls.field}>
                                        <label className={controls.label} htmlFor="co-card-name">
                                            {t("checkout.cardName")}
                                        </label>
                                        <input
                                            id="co-card-name"
                                            type="text"
                                            className={controls.input}
                                            placeholder="NGUYEN VAN A"
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.fieldRow}>
                                        <div className={controls.field}>
                                            <label className={controls.label} htmlFor="co-card-expiry">
                                                {t("checkout.cardExpiry")}
                                            </label>
                                            <input
                                                id="co-card-expiry"
                                                type="text"
                                                className={controls.input}
                                                placeholder="MM/YY"
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(e.target.value)}
                                            />
                                        </div>
                                        <div className={controls.field}>
                                            <label className={controls.label} htmlFor="co-card-cvv">
                                                CVV
                                            </label>
                                            <input
                                                id="co-card-cvv"
                                                type="text"
                                                inputMode="numeric"
                                                className={controls.input}
                                                placeholder="123"
                                                value={cardCvv}
                                                onChange={(e) => setCardCvv(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {error && <p className={controls.error}>{error}</p>}
                    </div>

                    <aside className={styles.summaryColumn}>
                        <div className={styles.summaryCard}>
                            <div className={styles.datesBlock}>
                                <h2 className={styles.summaryHeading}>
                                    <CalendarBlankIcon size={15} weight="bold" /> {t("checkout.datesTitle")}
                                </h2>

                                <DateRangeField
                                    checkIn={checkIn}
                                    checkOut={checkOut}
                                    onChange={(ci, co) => {
                                        setCheckIn(ci);
                                        setCheckOut(co);
                                    }}
                                    disabledDates={unavailable}
                                    loading={loadingDates}
                                />

                                <div className={styles.guestsField}>
                                    <label className={controls.label} htmlFor="co-guests">
                                        <UsersIcon size={13} weight="bold" /> {t("checkout.guestsLabel")}
                                    </label>
                                    <input
                                        id="co-guests"
                                        type="number"
                                        min={1}
                                        max={30}
                                        className={controls.input}
                                        value={guests}
                                        onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                                    />
                                </div>
                            </div>

                            <div className={styles.summaryDivider} />

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

                                {rooms.map((room) => (
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
                                        </div>
                                        <span className={styles.summaryRoomPrice}>
                                            {nights > 0 ? formatVnd(room.price * nights) : "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.summaryTotalRow}>
                                <span>{t("wishlist.summaryTotal")}</span>
                                <strong>{nights > 0 ? formatVnd(grandTotal) : t("checkout.pickDatesForTotal")}</strong>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={submitting}
                            >
                                {submitting
                                    ? t("checkout.submitting")
                                    : t("checkout.submit", { total: formatVnd(grandTotal) })}
                            </button>
                        </div>
                    </aside>
                </form>
            </div>
        </div>
    );
}
