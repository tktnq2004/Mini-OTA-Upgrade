"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    BedIcon,
    BuildingsIcon,
    CalendarBlankIcon,
    CheckCircleIcon,
    CircleNotchIcon,
    MapPinIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateVn, formatVnd } from "@/lib/format";
import { nightsBetween } from "@/lib/searchFilters";
import { getBookingStatus, type CreateBookingResult, type PaymentMethod } from "@/lib/booking/resources";
import { PublicApiError } from "@/lib/hotels/envelope";
import controls from "@/styles/controls.module.css";
import styles from "./success.module.css";

// Thẻ chờ 1 request mỗi POLL_INTERVAL_MS. SLOW_AFTER_MS: đổi câu chữ báo
// "đang mất lâu hơn bình thường" nhưng VẪN tiếp tục poll ngầm (webhook có thể
// tới muộn, không có nghĩa là thất bại — xem BookingService.markPaid,
// idempotent). STOP_POLLING_AFTER_MS: hàng rào cuối, tránh poll vô thời hạn
// nếu ai đó để tab mở cả ngày.
const POLL_INTERVAL_MS = 3000;
const SLOW_AFTER_MS = 45_000;
const STOP_POLLING_AFTER_MS = 10 * 60_000;

type ViewState = "loading" | "processing" | "slow" | "success" | "cancelled" | "error";

export default function SuccessView() {
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();

    const bookingId = Number(searchParams.get("bookingId")) || null;
    const email = searchParams.get("email") || "";
    const method = (searchParams.get("method") as PaymentMethod | null) ?? null;

    const [booking, setBooking] = useState<CreateBookingResult | null>(null);
    const [state, setState] = useState<ViewState>("loading");
    const [errorMessage, setErrorMessage] = useState("");

    // Refs thay vì state cho 2 giá trị chỉ đọc bên trong callback của
    // setInterval — tránh bẫy closure cũ (stale state) mà không phải thêm
    // bookingId/email/method vào dependency của effect (vốn đã ổn định suốt
    // vòng đời trang, đọc 1 lần từ URL). startedAtRef khởi tạo 0 rồi gán
    // Date.now() thật ở trong effect — gọi Date.now() ngay lúc useRef() là
    // impure call trong lúc render (ESLint react-hooks/purity chặn).
    const startedAtRef = useRef(0);
    const hasResultRef = useRef(false);

    useEffect(() => {
        startedAtRef.current = Date.now();
        if (!bookingId || !email) {
            // Thiếu tham số URL -> lỗi ngay từ đầu, không phải "tải dữ liệu
            // ngoài rồi set state" như các effect load-data khác trong dự án
            // (xem BookingsView/AccountView...), nhưng cùng lý do được chấp
            // nhận: input (searchParams) tới từ ngoài React, set state ở đây
            // là cách hợp lý nhất để phản ánh lại.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState("error");
            setErrorMessage(t("checkoutSuccess.errorMissingParams"));
            return;
        }

        // payAtHotel/momo: không có thanh toán nào để chờ xác nhận — Pending
        // chính là trạng thái đúng và cuối cùng, hỏi 1 lần cho đủ dữ liệu hoá
        // đơn rồi dừng, không cần poll.
        const needsPolling = method === "card";

        let alive = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const stop = () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        };

        const poll = () => {
            getBookingStatus(bookingId, email)
                .then((result) => {
                    if (!alive) return;
                    hasResultRef.current = true;
                    setBooking(result);

                    if (result.status === "Cancelled") {
                        setState("cancelled");
                        stop();
                        return;
                    }
                    if (result.status === "Completed" || !needsPolling) {
                        setState("success");
                        stop();
                        return;
                    }
                    // Pending + card -> vẫn đang chờ webhook Stripe/backend.
                    const elapsed = Date.now() - startedAtRef.current;
                    setState(elapsed > SLOW_AFTER_MS ? "slow" : "processing");
                    if (elapsed > STOP_POLLING_AFTER_MS) stop();
                })
                .catch((err) => {
                    if (!alive) return;
                    // Lỗi mạng/tạm thời giữa các lần poll thì bỏ qua, giữ
                    // nguyên màn hình đang có, thử lại ở lượt sau — chỉ coi là
                    // lỗi thật khi đây là lần gọi ĐẦU TIÊN (chưa có gì để hiển
                    // thị, không có "giữ nguyên" nào để quay về).
                    if (!hasResultRef.current) {
                        setState("error");
                        setErrorMessage(
                            err instanceof PublicApiError && err.message ? err.message : t("checkoutSuccess.errorNotFound")
                        );
                        stop();
                    }
                });
        };

        poll();
        if (needsPolling) timer = setInterval(poll, POLL_INTERVAL_MS);

        return () => {
            alive = false;
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bookingId/email/method đọc 1 lần từ URL lúc mount, không đổi trong vòng đời trang
    }, []);

    const nights = booking ? nightsBetween(booking.checkIn, booking.checkOut) : 0;
    // Bug thật đã biết ở backend (BookingService.create): totalAmount là tổng
    // giá 1 đêm của các phòng, CHƯA nhân số đêm — giữ đúng cách CheckoutView
    // đã hiển thị trước giờ (result.totalAmount * nights) để không lộ ra 1
    // con số khác với số tiền khách đã thấy lúc đặt.
    const grandTotal = booking ? booking.totalAmount * Math.max(nights, 1) : 0;

    return (
        <div className={styles.page}>
            <SiteHeader />
            <div className={styles.layout}>
                <div className={styles.card}>
                    {state === "loading" && (
                        <div className={styles.statusBlock}>
                            <CircleNotchIcon size={40} className={`${styles.spin} ${styles.mutedIcon}`} />
                            <p className={styles.statusHint}>{t("checkoutSuccess.loading")}</p>
                        </div>
                    )}

                    {state === "error" && (
                        <div className={styles.statusBlock}>
                            <WarningCircleIcon size={40} weight="fill" className={styles.errorIcon} />
                            <h1>{t("checkoutSuccess.errorTitle")}</h1>
                            <p className={styles.statusHint}>{errorMessage}</p>
                            <Link href="/" className={controls.button}>
                                {t("checkout.backHome")}
                            </Link>
                        </div>
                    )}

                    {state === "cancelled" && (
                        <div className={styles.statusBlock}>
                            <WarningCircleIcon size={40} weight="fill" className={styles.errorIcon} />
                            <h1>{t("checkoutSuccess.cancelledTitle")}</h1>
                            <p className={styles.statusHint}>{t("checkoutSuccess.cancelledHint")}</p>
                            <Link href="/" className={controls.button}>
                                {t("checkout.backHome")}
                            </Link>
                        </div>
                    )}

                    {(state === "processing" || state === "slow" || state === "success") && booking && (
                        <>
                            <div className={styles.statusBlock}>
                                {state === "success" ? (
                                    <CheckCircleIcon size={44} weight="fill" className={styles.successIcon} />
                                ) : (
                                    <CircleNotchIcon size={44} className={`${styles.spin} ${styles.processingIcon}`} />
                                )}
                                <h1>
                                    {state === "success"
                                        ? t("checkout.successTitle")
                                        : t("checkoutSuccess.processingTitle")}
                                </h1>
                                <p className={styles.statusHint}>
                                    {state === "success"
                                        ? t("checkout.successSubtitle", { code: `MO-${booking.bookingId}` })
                                        : state === "slow"
                                          ? t("checkoutSuccess.slowHint")
                                          : t("checkoutSuccess.processingHint")}
                                </p>
                            </div>

                            <div className={styles.invoice}>
                                <h2 className={styles.invoiceTitle}>{t("checkoutSuccess.invoiceTitle")}</h2>

                                {booking.hotelName && (
                                    <div className={styles.invoiceHotel}>
                                        <BuildingsIcon size={16} weight="light" />
                                        <div>
                                            <span className={styles.invoiceHotelName}>{booking.hotelName}</span>
                                            {booking.hotelAddress && (
                                                <span className={styles.invoiceHotelAddress}>
                                                    <MapPinIcon size={11} />
                                                    {booking.hotelAddress}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.invoiceDates}>
                                    <CalendarBlankIcon size={14} weight="bold" />
                                    <span>
                                        {formatDateVn(booking.checkIn, language)} → {formatDateVn(booking.checkOut, language)}
                                    </span>
                                    <span className={styles.invoiceNights}>{t("hotel.nightsSuffix", { count: nights })}</span>
                                </div>

                                <div className={styles.invoiceRooms}>
                                    {booking.rooms.map((room) => (
                                        <div key={room.roomId} className={styles.invoiceRoomRow}>
                                            <BedIcon size={14} weight="light" />
                                            <span className={styles.invoiceRoomName}>{room.roomName}</span>
                                            <span className={styles.invoiceRoomPrice}>
                                                {formatVnd(room.pricePerNight)} × {nights}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.invoiceTotalRow}>
                                    <span>{t("wishlist.summaryTotal")}</span>
                                    <strong>{formatVnd(grandTotal)}</strong>
                                </div>

                                <div className={styles.invoiceCode}>
                                    {t("checkoutSuccess.bookingCode")}: <strong>MO-{booking.bookingId}</strong>
                                </div>
                            </div>

                            <Link href="/" className={controls.button}>
                                {t("checkout.backHome")}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
