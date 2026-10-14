"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowRightIcon,
    BedIcon,
    BuildingsIcon,
    CheckCircleIcon,
    CircleNotchIcon,
    ClockIcon,
    CreditCardIcon,
    EnvelopeSimpleIcon,
    HandCoinsIcon,
    MapPinIcon,
    PhoneIcon,
    UserIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateVn, formatVnd } from "@/lib/format";
import { nightsBetween } from "@/lib/searchFilters";
import { bookingPayable, getBookingStatus, type CreateBookingResult, type PaymentMethod } from "@/lib/booking/resources";
import { PublicApiError } from "@/lib/hotels/envelope";
import { CardPaymentError } from "@/lib/booking/payment";
import CardPayment, { type PaymentFormHandle } from "../PaymentForm";
import SePayPanel from "../SePayPanel";
import controls from "@/styles/controls.module.css";
import checkoutStyles from "../checkout.module.css";
import styles from "./payment.module.css";
import PaymentSkeleton from "./PaymentSkeleton";

// Poll chờ webhook Stripe + webhook backend (markPaid) xác nhận thật, SAU KHI
// đã confirm xong phía Stripe (client-side). SLOW_AFTER_MS: đổi câu chữ báo
// "đang mất lâu hơn bình thường" nhưng vẫn tiếp tục poll ngầm — webhook tới
// muộn không có nghĩa là thất bại (markPaid idempotent).
const POLL_INTERVAL_MS = 3000;
const SLOW_AFTER_MS = 45_000;

// Đếm ngược 15 phút — HOÀN TOÀN do FE tự tính (createdAt truyền qua URL lúc
// CheckoutView tạo booking xong), KHÔNG phải hạn giữ chỗ thật từ backend.
// Backend hiện set expirationTime = now + 30 NGÀY (BookingService.create) và
// chưa có job nào tự huỷ booking Pending hết hạn — tức là hết giờ ở đây
// không hề giải phóng phòng thật. Vì vậy hết giờ KHÔNG khoá nút thanh toán,
// chỉ đổi màu/câu chữ báo nhẹ (xem checkoutPayment.countdownExpired) — tránh
// vừa nói dối "phòng có thể đã mất" vừa chặn nhầm 1 giao dịch vẫn hợp lệ.
const HOLD_MS = 15 * 60_000;

type ViewState = "loading" | "error" | "cancelled" | "selecting" | "processing" | "slow" | "success";

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PaymentView() {
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();

    const bookingId = Number(searchParams.get("bookingId")) || null;
    const email = searchParams.get("email") || "";
    const fullName = searchParams.get("fullName") || "";
    const phone = searchParams.get("phone") || "";
    const createdAtParam = searchParams.get("createdAt");

    const [booking, setBooking] = useState<CreateBookingResult | null>(null);
    const [state, setState] = useState<ViewState>("loading");
    const [errorMessage, setErrorMessage] = useState("");

    // Phương thức đã chọn — null = đang ở màn chọn. payAtHotel xác nhận xong
    // là trạng thái cuối luôn (booking đã Pending sẵn, không có gì để chờ
    // webhook); card thì chuyển "processing" sau khi Stripe confirm xong.
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState("");
    const [polling, setPolling] = useState(false);
    const paymentForm = useRef<PaymentFormHandle>(null);

    // Lazy initializer (hàm, chỉ chạy đúng 1 lần lúc mount) — KHÔNG phải
    // useRef(Date.now())/useRef(createdAtParam tính sẵn): gọi Date.now() hay
    // đọc .current trực tiếp trong thân render bị ESLint
    // react-hooks/purity + react-hooks/refs chặn (ref không được đọc lúc
    // render, chỉ trong effect/handler). createdAtMs không đổi sau lúc mount
    // nên dùng state (không phải ref) là đúng — code đọc nó trong render để
    // tính đếm ngược.
    const [now, setNow] = useState<number>(() => Date.now());
    const [createdAtMs] = useState<number>(() => {
        const parsed = createdAtParam ? Date.parse(createdAtParam) : NaN;
        return Number.isFinite(parsed) ? parsed : Date.now();
    });

    // 1) Tải booking lần đầu.
    useEffect(() => {
        if (!bookingId || !email) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- searchParams tới từ ngoài React, set state ở đây là cách hợp lý nhất để phản ánh lại
            setState("error");
            setErrorMessage(t("checkoutPayment.errorMissingParams"));
            return;
        }

        let alive = true;
        getBookingStatus(bookingId, email)
            .then((result) => {
                if (!alive) return;
                setBooking(result);
                if (result.status === "Cancelled") setState("cancelled");
                else if (result.status === "Completed") setState("success");
                else setState("selecting");
            })
            .catch((err) => {
                if (!alive) return;
                setState("error");
                setErrorMessage(
                    err instanceof PublicApiError && err.message ? err.message : t("checkoutPayment.errorNotFound")
                );
            });
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bookingId/email/createdAt đọc 1 lần từ URL lúc mount, không đổi trong vòng đời trang
    }, []);

    // 2) Tick đồng hồ mỗi giây cho đếm ngược — chỉ chạy lúc còn ở màn chọn
    // phương thức (sau đó không còn ý nghĩa hiển thị nữa).
    useEffect(() => {
        if (state !== "selecting") return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [state]);

    // 3) Poll trạng thái — chỉ bật khi đã confirm thẻ xong phía Stripe
    // (handlePayNow set polling=true), tắt khi tới trạng thái cuối.
    useEffect(() => {
        if (!polling || !bookingId || !email) return;
        let alive = true;
        const startedAt = Date.now();
        // method đọc trong closure bên dưới — thêm vào deps để không bị "cũ"
        // nếu khách đổi phương thức trong lúc poll SePay đang chạy nền.

        const poll = () => {
            getBookingStatus(bookingId, email)
                .then((result) => {
                    if (!alive) return;
                    setBooking(result);
                    if (result.status === "Cancelled") {
                        setState("cancelled");
                        setPolling(false);
                        return;
                    }
                    if (result.status === "Completed") {
                        setState("success");
                        setPolling(false);
                        return;
                    }
                    // Chuyển khoản SePay: còn Pending nghĩa là khách CHƯA chuyển
                    // khoản xong (chưa hề "làm" gì ở trang này, khác thẻ đã
                    // confirm xong phía Stripe) — giữ nguyên màn hình chọn
                    // phương thức (đang hiện QR) thay vì nhảy sang màn
                    // processing/spinner, kẻo khách mất luôn QR đang cần quét.
                    if (method !== "bankTransfer") {
                        setState(Date.now() - startedAt > SLOW_AFTER_MS ? "slow" : "processing");
                    }
                })
                .catch(() => {
                    // Lỗi mạng tạm thời giữa các lần poll thì bỏ qua, giữ
                    // nguyên màn hình hiện tại, thử lại ở lượt sau.
                });
        };

        poll();
        const id = setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [polling, bookingId, email, method]);

    const handlePayNow = async () => {
        if (!booking) return;
        setPayError("");
        const cardError = paymentForm.current?.validate();
        if (cardError) {
            setPayError(cardError);
            return;
        }
        setPaying(true);
        try {
            await paymentForm.current?.pay(booking.bookingId, { name: fullName, email, phone });
            // Xác nhận client-side (stripe.js) xong chỉ là bước đầu — DB còn
            // đang chờ webhook Stripe + webhook backend xác nhận thật, nên
            // chuyển "processing" rồi bật poll, không coi đây là thành công.
            setState("processing");
            setPolling(true);
        } catch (err) {
            // Lỗi ở đây = "không thành công", đúng yêu cầu "quay về booking
            // infor" — vì chưa từng điều hướng đi đâu (vẫn ở method==="card"
            // trên chính trang này), chỉ cần hiện lỗi để khách thử lại.
            setPayError(err instanceof CardPaymentError && err.message ? err.message : t("checkout.errorPayment"));
        } finally {
            setPaying(false);
        }
    };

    const handleConfirmPayAtHotel = () => {
        setMethod("payAtHotel");
        setState("success");
    };

    const nights = booking ? nightsBetween(booking.checkIn, booking.checkOut) : 0;
    // Số tiền thật phải trả do backend chốt (payableAmount, đã trừ khuyến
    // mãi). Backend cũ chưa có field này thì lùi về totalAmount × số đêm.
    const grandTotal = booking ? bookingPayable(booking, nights) : 0;
    const discountAmount = booking?.discountAmount ?? 0;

    const remainingMs = HOLD_MS - (now - createdAtMs);
    const holdExpired = remainingMs <= 0;

    // Ưu tiên dữ liệu backend trả về (đáng tin hơn, sống sót qua refresh) —
    // fullName/phone từ URL chỉ là fallback (lúc vừa tạo booking, backend có
    // thể chưa kịp phản ánh cho lần fetch đầu, hoặc dữ liệu cũ thiếu field
    // mới thêm). Email luôn lấy từ URL vì đó chính là email dùng để tra cứu
    // booking (phải khớp 100% với BookingService.lookup).
    const guestFullName = booking?.guestFullName || fullName;
    const guestPhone = booking?.guestPhone || phone;

    const invoiceBlock = booking && (
        <div className={styles.invoice}>
            <p className={styles.invoiceSectionLabel}>{t("checkoutPayment.invoiceTitle")}</p>

            {booking.hotelName && (
                <div className={styles.invoiceHotel}>
                    <BuildingsIcon size={20} weight="light" />
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

            <div className={styles.invoiceDivider} />

            <div>
                <div className={styles.dateChips}>
                    <div className={styles.dateChip}>
                        <span className={styles.dateChipLabel}>{t("checkoutPayment.checkinLabel")}</span>
                        <span className={styles.dateChipValue}>{formatDateVn(booking.checkIn, language)}</span>
                    </div>
                    <ArrowRightIcon size={14} className={styles.dateChipsArrow} />
                    <div className={styles.dateChip}>
                        <span className={styles.dateChipLabel}>{t("checkoutPayment.checkoutLabel")}</span>
                        <span className={styles.dateChipValue}>{formatDateVn(booking.checkOut, language)}</span>
                    </div>
                </div>
                <p className={styles.nightsBadge}>{t("hotel.nightsSuffix", { count: nights })}</p>
            </div>

            <div className={styles.invoiceRooms}>
                {booking.rooms.map((room) => (
                    <div key={room.roomId}>
                        <div className={styles.invoiceRoomRow}>
                            <BedIcon size={14} weight="light" />
                            <span className={styles.invoiceRoomName}>{room.roomName}</span>
                            <span className={styles.invoiceRoomPrice}>
                                {formatVnd(room.pricePerNight)} × {nights}
                            </span>
                        </div>
                        {room.discounts?.map((d, i) => (
                            <div key={d.discountId ?? i} className={styles.invoiceDiscountRow}>
                                <span>{t("discount.line", { name: d.name, count: d.nights })}</span>
                                <span>-{formatVnd(d.amount)}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className={styles.invoiceDivider} />

            <div>
                <p className={styles.invoiceSectionLabel}>{t("checkoutPayment.guestInfoTitle")}</p>
                <div className={styles.guestInfo}>
                    {guestFullName && (
                        <div className={styles.guestRow}>
                            <UserIcon size={14} weight="light" />
                            <span>{guestFullName}</span>
                        </div>
                    )}
                    {email && (
                        <div className={styles.guestRow}>
                            <EnvelopeSimpleIcon size={14} weight="light" />
                            <span>{email}</span>
                        </div>
                    )}
                    {guestPhone && (
                        <div className={styles.guestRow}>
                            <PhoneIcon size={14} weight="light" />
                            <span>{guestPhone}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.invoiceDivider} />

            {discountAmount > 0 && (
                <div className={styles.invoiceDiscountSummary}>
                    <div>
                        <span>{t("discount.subtotal")}</span>
                        <span>{formatVnd(booking.subtotalAmount ?? grandTotal + discountAmount)}</span>
                    </div>
                    <div className={styles.invoiceDiscountRow}>
                        <span>{t("discount.totalDiscount")}</span>
                        <span>-{formatVnd(discountAmount)}</span>
                    </div>
                </div>
            )}

            <div className={styles.invoiceTotalRow}>
                <span>{t("wishlist.summaryTotal")}</span>
                <strong>{formatVnd(grandTotal)}</strong>
            </div>

            <div className={styles.invoiceCode}>
                {t("checkoutPayment.bookingCode")}: <strong>MO-{booking.bookingId}</strong>
            </div>
        </div>
    );

    return (
        <div className={styles.page}>
            <SiteHeader />
            <div className={styles.layout}>
                <div
                    className={styles.card}
                    aria-busy={state === "loading" || undefined}
                    aria-label={state === "loading" ? t("checkoutPayment.loading") : undefined}
                >
                    {state === "loading" && <PaymentSkeleton />}

                    {state === "error" && (
                        <div className={styles.statusBlock}>
                            <div className={`${styles.statusIconWrap} ${styles.statusIconWrapError}`}>
                                <WarningCircleIcon size={32} weight="fill" className={styles.errorIcon} />
                            </div>
                            <h1>{t("checkoutPayment.errorTitle")}</h1>
                            <p className={styles.statusHint}>{errorMessage}</p>
                            <Link href="/" className={controls.button}>
                                {t("checkout.backHome")}
                            </Link>
                        </div>
                    )}

                    {state === "cancelled" && (
                        <div className={styles.statusBlock}>
                            <div className={`${styles.statusIconWrap} ${styles.statusIconWrapError}`}>
                                <WarningCircleIcon size={32} weight="fill" className={styles.errorIcon} />
                            </div>
                            <h1>{t("checkoutPayment.cancelledTitle")}</h1>
                            <p className={styles.statusHint}>{t("checkoutPayment.cancelledHint")}</p>
                            <Link href="/" className={controls.button}>
                                {t("checkout.backHome")}
                            </Link>
                        </div>
                    )}

                    {state === "selecting" && booking && (
                        <>
                            <div className={styles.statusBlock}>
                                <div className={`${styles.statusIconWrap} ${styles.statusIconWrapProcessing}`}>
                                    <CreditCardIcon size={30} weight="light" className={styles.processingIcon} />
                                </div>
                                <h1>{t("checkoutPayment.pageTitle")}</h1>
                                <div className={`${styles.countdown} ${holdExpired ? styles.countdownExpired : ""}`}>
                                    <ClockIcon size={14} weight="bold" />
                                    {holdExpired ? (
                                        <span>{t("checkoutPayment.countdownExpired")}</span>
                                    ) : (
                                        <>
                                            <span>{t("checkoutPayment.countdownLabel")}</span>
                                            <span className={styles.countdownValue}>{formatCountdown(remainingMs)}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {invoiceBlock}

                            <div className={styles.methodSection}>
                                <h2 className={styles.methodSectionTitle}>{t("checkoutPayment.chooseMethodTitle")}</h2>

                                <div className={checkoutStyles.paymentOptions}>
                                    <label
                                        className={`${checkoutStyles.paymentOption} ${method === "payAtHotel" ? checkoutStyles.paymentOptionActive : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={method === "payAtHotel"}
                                            onChange={() => setMethod("payAtHotel")}
                                        />
                                        <HandCoinsIcon size={18} />
                                        <span>{t("checkout.payAtHotel")}</span>
                                    </label>
                                    <label
                                        className={`${checkoutStyles.paymentOption} ${method === "card" ? checkoutStyles.paymentOptionActive : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={method === "card"}
                                            onChange={() => setMethod("card")}
                                        />
                                        <CreditCardIcon size={18} />
                                        <span>{t("checkout.payByCard")}</span>
                                    </label>
                                    <label
                                        className={`${checkoutStyles.paymentOption} ${method === "momo" ? checkoutStyles.paymentOptionActive : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={method === "momo"}
                                            onChange={() => setMethod("momo")}
                                        />
                                        <span className={checkoutStyles.momoBadge} aria-hidden="true">
                                            mo
                                        </span>
                                        <span>{t("checkout.payByMomo")}</span>
                                    </label>
                                    <label
                                        className={`${checkoutStyles.paymentOption} ${method === "bankTransfer" ? checkoutStyles.paymentOptionActive : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={method === "bankTransfer"}
                                            onChange={() => setMethod("bankTransfer")}
                                        />
                                        <span className={checkoutStyles.sepayBadge} aria-hidden="true">
                                            qr
                                        </span>
                                        <span>{t("checkout.payBySepay")}</span>
                                    </label>
                                </div>

                                {method === "payAtHotel" && (
                                    <>
                                        <p className={checkoutStyles.paymentNote}>{t("checkout.payAtHotelNote")}</p>
                                        <button type="button" className={controls.button} onClick={handleConfirmPayAtHotel}>
                                            {t("checkoutPayment.confirmPayAtHotel")}
                                        </button>
                                    </>
                                )}

                                {method === "momo" && <p className={checkoutStyles.paymentNote}>{t("checkout.momoComingSoon")}</p>}

                                {method === "bankTransfer" && (
                                    // Không có nút "xác nhận" nào ở đây — hiện QR xong là tự
                                    // bật poll (onReady), khác hẳn thẻ cần bấm "Thanh toán"
                                    // để confirm qua Stripe trước (xem handlePayNow).
                                    <SePayPanel bookingId={booking.bookingId} email={email} onReady={() => setPolling(true)} />
                                )}

                                {method === "card" && (
                                    <>
                                        <CardPayment ref={paymentForm} />
                                        {payError && <p className={controls.error}>{payError}</p>}
                                        <button
                                            type="button"
                                            className={controls.button}
                                            disabled={paying}
                                            onClick={handlePayNow}
                                        >
                                            {paying
                                                ? t("checkout.submitting")
                                                : t("checkoutPayment.payNowButton", { total: formatVnd(grandTotal) })}
                                        </button>
                                    </>
                                )}

                                {method && (
                                    <button type="button" className={styles.changeMethodButton} onClick={() => setMethod(null)}>
                                        {t("checkoutPayment.changeMethod")}
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {(state === "processing" || state === "slow" || state === "success") && booking && (
                        <>
                            <div className={styles.statusBlock}>
                                <div
                                    className={`${styles.statusIconWrap} ${state === "success" ? styles.statusIconWrapSuccess : styles.statusIconWrapProcessing}`}
                                >
                                    {state === "success" ? (
                                        <CheckCircleIcon size={36} weight="fill" className={styles.successIcon} />
                                    ) : (
                                        <CircleNotchIcon size={36} className={`${styles.spin} ${styles.processingIcon}`} />
                                    )}
                                </div>
                                <h1>
                                    {state === "success"
                                        ? method === "payAtHotel"
                                            ? t("checkoutPayment.payAtHotelConfirmedTitle")
                                            : t("checkout.successTitle")
                                        : t("checkoutPayment.processingTitle")}
                                </h1>
                                <p className={styles.statusHint}>
                                    {state === "success"
                                        ? method === "payAtHotel"
                                            ? t("checkoutPayment.payAtHotelConfirmedHint")
                                            : t("checkout.successSubtitle", { code: `MO-${booking.bookingId}` })
                                        : state === "slow"
                                          ? t("checkoutPayment.slowHint")
                                          : t("checkoutPayment.processingHint")}
                                </p>
                            </div>

                            {invoiceBlock}

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
