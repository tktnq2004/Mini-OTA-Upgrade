"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeftIcon,
    BuildingsIcon,
    BedIcon,
    MapPinIcon,
    CalendarBlankIcon,
    ShoppingBagIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import GuestsField from "@/components/GuestsField/GuestsField";
import DateRangeField from "@/components/DateRangePicker/DateRangeField";
import { useAccount } from "@/components/auth/AccountProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import { getMyProfile } from "@/lib/auth/resources";
import { getHotel, PublicApiError } from "@/lib/hotels/resources";
import type { Hotel, Room } from "@/lib/hotels/types";
import { nightsBetween } from "@/lib/searchFilters";
import { getRoomsAvailability, isRangeBookable, type RoomsAvailability } from "@/lib/booking/availability";
import { createBooking } from "@/lib/booking/resources";
import { quoteRoom } from "@/lib/booking/discount";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";
import CheckoutSkeleton from "./CheckoutSkeleton";

export default function CheckoutView() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { remove: removeFromWishlist } = useWishlist();
    const { user, ready: accountReady } = useAccount();

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

    const [availability, setAvailability] = useState<RoomsAvailability>({ disabledDates: [] });
    const [loadingDates, setLoadingDates] = useState(true);

    useEffect(() => {
        if (roomIds.length === 0) return;
        let alive = true;
        // GET /rooms/{id} của từng phòng: đêm đã kín + cửa sổ đặt phòng (min/max).
        getRoomsAvailability(roomIds)
            .then((a) => {
                if (!alive) return;
                setAvailability(a);
                // Ngày điền sẵn từ URL mà đã kín/ngoài cửa sổ thì bỏ, khách chọn lại.
                if (!isRangeBookable(searchParams.get("checkin"), searchParams.get("checkout"), a)) {
                    setCheckIn(null);
                    setCheckOut(null);
                }
            })
            .catch(() => {
                if (alive) setAvailability({ disabledDates: [] });
            })
            .finally(() => {
                if (alive) setLoadingDates(false);
            });
        return () => {
            alive = false;
        };
    }, [roomIds, searchParams]);

    // Tối đa số khách = tổng sức chứa các phòng đã chọn (không có phòng thì 30).
    const maxGuests = rooms.reduce((sum, r) => sum + r.capacity, 0) || 30;
    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
    // Giá xem trước sau khuyến mãi của từng phòng cho kỳ ở đang chọn. Số
    // tiền THẬT do backend chốt lúc tạo booking (trang payment hiện số đó).
    const roomQuotes = rooms.map((room) => ({
        room,
        quote: nights > 0 && checkIn && checkOut ? quoteRoom(room, checkIn, checkOut) : null,
    }));
    const subtotal = roomQuotes.reduce((sum, { quote }) => sum + (quote?.subtotal ?? 0), 0);
    const discountTotal = roomQuotes.reduce((sum, { quote }) => sum + (quote?.discountAmount ?? 0), 0);
    const grandTotal = subtotal - discountTotal;

    // ----- Thông tin khách + thanh toán -----
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");

    // Đã đăng nhập (customer) -> tự điền tên/email/sđt từ hồ sơ, đỡ phải gõ
    // lại. SessionUser (useAccount().user) chỉ có id/email/name từ JWT,
    // thiếu phone, nên vẫn phải gọi GET /users/me riêng (getMyProfile) lấy
    // đủ hồ sơ. Chỉ điền vào field còn trống (prev || ...) để không đè chữ
    // khách đã tự gõ nếu profile về chậm hơn; lỗi tải hồ sơ thì bỏ qua, cứ
    // để khách tự điền tay như khách vãng lai.
    useEffect(() => {
        if (!accountReady || !user) return;
        let alive = true;
        getMyProfile()
            .then((profile) => {
                if (!alive) return;
                setFullName((prev) => prev || profile.fullName || "");
                setEmail((prev) => prev || profile.email || "");
                setPhone((prev) => prev || profile.phone || "");
            })
            .catch(() => {
                // Không lấy được hồ sơ thì thôi, không chặn checkout.
            });
        return () => {
            alive = false;
        };
    }, [accountReady, user]);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Trang này giờ CHỈ tạo booking (giữ chỗ) — chọn phương thức + thanh toán
    // chuyển hết sang /checkout/payment (trang riêng, nhận bookingId qua URL).
    // Lý do tách: trước đây "tạo booking -> xin clientSecret -> confirm
    // Stripe" dồn hết vào 1 lần submit, đứt mạng/đóng tab giữa chừng là mất
    // trắng, không có gì để quay lại đúng chỗ. Giờ có 1 "điểm nghỉ" thật ở
    // chỗ tạo booking xong — đã có bookingId, vào lại bằng URL vẫn đúng.
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
        if (!hotelId || rooms.length === 0) return;

        setSubmitting(true);
        try {
            const result = await createBooking({
                roomIds: rooms.map((r) => r.id),
                checkIn,
                checkOut,
                guest: { fullName, email, phone },
            });
            // Đặt xong thì bỏ các phòng vừa đặt khỏi wishlist (nếu có).
            rooms.forEach((r) => removeFromWishlist(hotelId, r.id));
            // createdAt: backend chưa có field này (ReqCreateBookingDTO/
            // ResBookingDTO không trả) — FE tự gán mốc "vừa tạo xong" để trang
            // /checkout/payment tính đếm ngược 15 phút (chỉ mang tính hiển
            // thị, xem ghi chú HOLD_MS ở PaymentView). fullName/phone cũng
            // truyền kèm vì trang payment cần cho billing_details của Stripe
            // mà không có cách nào lấy lại từ GET /bookings/lookup (backend
            // không trả 2 field này).
            const params = new URLSearchParams({
                bookingId: String(result.bookingId),
                email,
                fullName: fullName.trim(),
                phone,
                createdAt: new Date().toISOString(),
            });
            router.push(`/checkout/payment?${params.toString()}`);
        } catch (err) {
            setError(err instanceof PublicApiError && err.message ? err.message : t("checkout.errorSubmit"));
            setSubmitting(false);
        }
    };

    if (loadingHotel) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout} aria-busy="true" aria-label={t("checkout.loading")}>
                    <Link href={backHref} className={styles.backLink}>
                        <ArrowLeftIcon size={14} weight="bold" />
                        {cameFromHotel ? t("checkout.backToHotel") : t("checkout.backToWishlist")}
                    </Link>
                    <h1 className={styles.title}>{t("checkout.title")}</h1>
                    <CheckoutSkeleton />
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

                            <div className={styles.fieldRow}>
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
                                <GuestsField stacked value={guests} onChange={setGuests} max={maxGuests} />
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
                                    alwaysOpen
                                    disabledDates={availability.disabledDates}
                                    minDate={availability.minDate}
                                    maxDate={availability.maxDate}
                                    loading={loadingDates}
                                />

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

                                {roomQuotes.map(({ room, quote }) => (
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

                            {discountTotal > 0 && (
                                <div className={styles.summaryDiscountRows}>
                                    <div>
                                        <span>{t("discount.subtotal")}</span>
                                        <span>{formatVnd(subtotal)}</span>
                                    </div>
                                    <div className={styles.summaryDiscountAmount}>
                                        <span>{t("discount.totalDiscount")}</span>
                                        <span>-{formatVnd(discountTotal)}</span>
                                    </div>
                                </div>
                            )}

                            <div className={styles.summaryTotalRow}>
                                <span>{t("wishlist.summaryTotal")}</span>
                                <strong>{nights > 0 ? formatVnd(grandTotal) : t("checkout.pickDatesForTotal")}</strong>
                            </div>
                            {discountTotal > 0 && <p className={styles.summaryDiscountNote}>{t("discount.previewNote")}</p>}

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={submitting}
                            >
                                {submitting ? t("checkout.submitting") : t("checkout.continueToPayment")}
                            </button>
                        </div>
                    </aside>
                </form>
            </div>
        </div>
    );
}
