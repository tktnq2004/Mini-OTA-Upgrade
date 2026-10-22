"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CalendarBlankIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import DateRangeField from "@/components/DateRangePicker/DateRangeField";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PublicApiError } from "@/lib/hotels/resources";
import { nightsBetween } from "@/lib/searchFilters";
import { createBooking } from "@/lib/booking/resources";
import { rememberBookingToken } from "@/lib/booking/payment";
import { quoteStay } from "@/lib/booking/discount";
import { FEATURES } from "@/lib/features";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";
import CheckoutSkeleton from "./_components/CheckoutSkeleton";
import { useCheckoutData } from "./_hooks/useCheckoutData";
import CustomerInfoSection from "./_components/CustomerInfoSection";
import OrderSummary from "./_components/OrderSummary";

export default function CheckoutView() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { remove: removeFromWishlist } = useWishlist();

    const { hotelId, hotel, loadingHotel, rooms, checkIn, checkOut, setDates, availability, loadingDates, guest } =
        useCheckoutData(searchParams);
    const { fullName, email, phone } = guest;

    const cameFromHotel = searchParams.get("from") === "hotel";
    const backHref = cameFromHotel && hotelId ? `/hotel/${hotelId}` : "/wishlist";
    const backLink = (
        <Link href={backHref} className={styles.backLink}>
            <ArrowLeftIcon size={14} weight="bold" />
            {cameFromHotel ? t("checkout.backToHotel") : t("checkout.backToWishlist")}
        </Link>
    );

    const [guests, setGuests] = useState(() => Number(searchParams.get("guests")) || 2);
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Tối đa số khách = tổng sức chứa các phòng đã chọn (không có phòng thì 30).
    const maxGuests = rooms.reduce((sum, r) => sum + r.capacity, 0) || 30;
    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
    // Giá xem trước sau khuyến mãi của cả đơn cho kỳ ở đang chọn.
    const stay = quoteStay(rooms, checkIn, checkOut);

    // Trang này CHỈ tạo booking (giữ chỗ) — chọn phương thức + thanh toán ở
    // /checkout/payment (trang riêng, nhận bookingId qua URL). Tách ra để có 1
    // "điểm nghỉ" thật sau khi tạo booking: đứt mạng/đóng tab giữa chừng thì
    // vào lại bằng URL vẫn đúng chỗ.
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
            rememberBookingToken(result.bookingId, result.guestAccessToken);
            // Đặt xong thì bỏ các phòng vừa đặt khỏi wishlist (nếu có).
            rooms.forEach((r) => removeFromWishlist(hotelId, r.id));
            // fullName/phone truyền kèm vì trang payment cần cho billing_details
            // của Stripe. Hạn giữ chỗ KHÔNG truyền qua URL — trang payment đọc
            // expirationTime thật từ backend.
            const params = new URLSearchParams({
                bookingId: String(result.bookingId),
                email,
                fullName: fullName.trim(),
                phone,
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
                    {backLink}
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
                {backLink}

                <h1 className={styles.title}>{t("checkout.title")}</h1>

                <form className={styles.grid} onSubmit={handleSubmit}>
                    <div className={styles.formColumn}>
                        <CustomerInfoSection
                            fullName={fullName}
                            onFullNameChange={guest.setFullName}
                            email={email}
                            onEmailChange={guest.setEmail}
                            phone={phone}
                            onPhoneChange={guest.setPhone}
                            note={note}
                            onNoteChange={setNote}
                            guests={guests}
                            onGuestsChange={setGuests}
                            maxGuests={maxGuests}
                        />

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
                                    onChange={setDates}
                                    alwaysOpen
                                    disabledDates={availability.disabledDates}
                                    minDate={availability.minDate}
                                    maxDate={availability.maxDate}
                                    loading={loadingDates}
                                />
                            </div>

                            <div className={styles.summaryDivider} />

                            <OrderSummary hotel={hotel} stay={stay} nights={nights} />

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={submitting && !FEATURES.allowDoubleSubmit}
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
