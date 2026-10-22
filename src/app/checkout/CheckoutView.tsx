"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CalendarBlankIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import DateRangeField from "@/components/DateRangePicker/DateRangeField";
import { useAccount } from "@/components/auth/AccountProvider";
import GuestOtpForm from "@/components/auth/GuestOtpForm";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AccountApiError } from "@/lib/auth/apiClient";
import { nightsBetween } from "@/lib/searchFilters";
import { createBooking } from "@/lib/booking/resources";
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
    const { user, ready: accountReady } = useAccount();

    const { hotelId, hotel, loadingHotel, rooms, checkIn, checkOut, setDates, availability, loadingDates, guest } =
        useCheckoutData(searchParams);
    const { fullName, phone } = guest;
    // Đã có phiên (khách hàng hoặc GUEST còn hạn) thì booking gắn theo tài
    // khoản đó -> email liên hệ cố định là email của phiên.
    const email = user ? user.email : guest.email.trim();

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
    // Khách chưa có phiên: bấm đặt -> hiện bước xác minh email (OTP) thay cho
    // form, đúng mã mới tạo booking (giữ phòng) — thời gian chờ mã không ăn
    // vào hạn giữ chỗ. Dữ liệu form vẫn ở state trang này, "Sửa thông tin" là
    // quay lại y nguyên.
    const [verifying, setVerifying] = useState(false);

    // Tối đa số khách = tổng sức chứa các phòng đã chọn (không có phòng thì 30).
    const maxGuests = rooms.reduce((sum, r) => sum + r.capacity, 0) || 30;
    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
    // Giá xem trước sau khuyến mãi của cả đơn cho kỳ ở đang chọn.
    const stay = quoteStay(rooms, checkIn, checkOut);

    // Trang này CHỈ tạo booking (giữ chỗ) — chọn phương thức + thanh toán ở
    // /checkout/payment (trang riêng, nhận bookingId qua URL). Tách ra để có 1
    // "điểm nghỉ" thật sau khi tạo booking: đứt mạng/đóng tab giữa chừng thì
    // vào lại bằng URL vẫn đúng chỗ. URL chỉ mang bookingId: trang payment tự
    // tải booking bằng phiên (chỉ chủ booking xem được) — tên/sđt/hạn giữ chỗ
    // đều lấy từ backend.
    const submitBooking = async () => {
        if (!checkIn || !checkOut || !hotelId || rooms.length === 0) return;
        setSubmitting(true);
        try {
            const result = await createBooking({
                roomIds: rooms.map((r) => r.id),
                checkIn,
                checkOut,
                guest: { fullName: fullName.trim(), email, phone: phone.trim() },
            });
            // Đặt xong thì bỏ các phòng vừa đặt khỏi wishlist (nếu có).
            rooms.forEach((r) => removeFromWishlist(hotelId, r.id));
            router.push(`/checkout/payment?bookingId=${result.bookingId}`);
        } catch (err) {
            setVerifying(false);
            setError(err instanceof AccountApiError && err.message ? err.message : t("checkout.errorSubmit"));
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!checkIn || !checkOut) {
            setError(t("checkout.errorDates"));
            return;
        }
        if (!fullName.trim() || !email || !phone.trim()) {
            setError(t("checkout.errorRequired"));
            return;
        }
        if (!hotelId || rooms.length === 0) return;

        if (!user) {
            setVerifying(true);
            return;
        }
        await submitBooking();
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

    if (verifying) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout}>
                    <h1 className={styles.title}>{t("checkout.title")}</h1>
                    <section className={styles.formSection}>
                        <GuestOtpForm
                            title={t("guestOtp.checkoutTitle")}
                            hint={t("guestOtp.checkoutHint")}
                            email={email}
                            details={{ fullName: fullName.trim(), phone: phone.trim() }}
                            submitLabel={t("guestOtp.checkoutSubmit")}
                            onVerified={submitBooking}
                            onCancel={() => setVerifying(false)}
                            cancelLabel={t("guestOtp.backToForm")}
                        />
                    </section>
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
                            email={user ? user.email : guest.email}
                            onEmailChange={guest.setEmail}
                            emailLocked={Boolean(user)}
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

                            {/* Chưa biết có phiên hay chưa thì chưa cho đặt (tránh hỏi OTP thừa). */}
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={!accountReady || (submitting && !FEATURES.allowDoubleSubmit)}
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
