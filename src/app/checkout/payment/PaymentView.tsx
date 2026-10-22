"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useAccount } from "@/components/auth/AccountProvider";
import GuestOtpForm from "@/components/auth/GuestOtpForm";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { bookingPayable } from "@/lib/booking/resources";
import controls from "@/styles/controls.module.css";
import checkoutStyles from "../checkout.module.css";
import styles from "./payment.module.css";
import PaymentSkeleton from "./_components/PaymentSkeleton";
import { useBookingPayment } from "./_hooks/useBookingPayment";
import InvoiceBlock from "./_components/InvoiceBlock";
import StatusHeader from "./_components/StatusHeader";
import HoldCountdown from "./_components/HoldCountdown";
import PaymentMethodSection from "./_components/PaymentMethodSection";

// Trang /checkout/payment?bookingId=: tải booking bằng phiên hiện tại rồi hiện
// đúng màn theo trạng thái. URL chỉ mang bookingId — không email/tên/sđt; chưa
// có phiên thì xác minh email bằng OTP ngay tại đây. Logic trạng thái nằm ở
// useBookingPayment; file này chỉ chọn màn.
export default function PaymentView() {
    const { t } = useLanguage();
    const { user } = useAccount();
    const searchParams = useSearchParams();

    const bookingId = Number(searchParams.get("bookingId")) || null;

    const [paying, setPaying] = useState(false);
    // Màn thành công có câu chữ riêng cho "thanh toán tại khách sạn".
    const [paidAtHotel, setPaidAtHotel] = useState(false);

    const {
        booking,
        state,
        errorMessage,
        hasDeadline,
        remainingMs,
        holdExpired,
        startCardSync,
        markPayAtHotelConfirmed,
        reloadAfterVerify,
    } = useBookingPayment({ bookingId, paying });

    // Thông tin liên hệ lấy từ booking (backend); email thiếu thì lùi về email
    // của phiên — booking luôn thuộc chủ phiên.
    const billing = {
        name: booking?.guestFullName ?? "",
        email: booking?.guestEmail || user?.email || "",
        phone: booking?.guestPhone ?? "",
    };

    const invoice = booking && <InvoiceBlock booking={booking} email={billing.email} />;
    const backHome = (
        <Link href="/" className={controls.button}>
            {t("checkout.backHome")}
        </Link>
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

                    {state === "verify" && (
                        <GuestOtpForm
                            title={t("checkoutPayment.verifyTitle")}
                            hint={t("checkoutPayment.verifyHint")}
                            onVerified={reloadAfterVerify}
                        />
                    )}

                    {state === "error" && (
                        <StatusHeader variant="error" title={t("checkoutPayment.errorTitle")} hint={errorMessage}>
                            {backHome}
                        </StatusHeader>
                    )}

                    {state === "cancelled" && (
                        <StatusHeader
                            variant="error"
                            title={t("checkoutPayment.cancelledTitle")}
                            hint={t("checkoutPayment.cancelledHint")}
                        >
                            {invoice}
                            {backHome}
                        </StatusHeader>
                    )}

                    {state === "refund" && booking && (
                        <StatusHeader
                            variant="error"
                            title={
                                booking.status === "REFUNDED"
                                    ? t("checkoutPayment.refundedTitle")
                                    : t("checkoutPayment.refundPendingTitle")
                            }
                            hint={
                                booking.status === "REFUNDED"
                                    ? t("checkoutPayment.refundedHint")
                                    : t("checkoutPayment.refundPendingHint", { code: `MO-${booking.bookingId}` })
                            }
                        >
                            {invoice}
                            {backHome}
                        </StatusHeader>
                    )}

                    {state === "selecting" && booking && (
                        <>
                            <StatusHeader variant="selecting" title={t("checkoutPayment.pageTitle")}>
                                {hasDeadline && <HoldCountdown remainingMs={remainingMs} expired={holdExpired} />}
                            </StatusHeader>

                            {invoice}

                            {holdExpired ? (
                                <div className={styles.methodSection}>
                                    <p className={checkoutStyles.paymentNote}>{t("checkoutPayment.expiredHint")}</p>
                                    {backHome}
                                </div>
                            ) : (
                                <PaymentMethodSection
                                    booking={booking}
                                    grandTotal={bookingPayable(booking)}
                                    billing={billing}
                                    paying={paying}
                                    onPayingChange={setPaying}
                                    onCardConfirmed={startCardSync}
                                    onPayAtHotelConfirmed={() => {
                                        setPaidAtHotel(true);
                                        markPayAtHotelConfirmed();
                                    }}
                                />
                            )}
                        </>
                    )}

                    {(state === "processing" || state === "slow" || state === "success") && booking && (
                        <>
                            <StatusHeader
                                variant={state === "success" ? "success" : "processing"}
                                title={
                                    state === "success"
                                        ? paidAtHotel
                                            ? t("checkoutPayment.payAtHotelConfirmedTitle")
                                            : t("checkout.successTitle")
                                        : t("checkoutPayment.processingTitle")
                                }
                                hint={
                                    state === "success"
                                        ? paidAtHotel
                                            ? t("checkoutPayment.payAtHotelConfirmedHint")
                                            : t("checkout.successSubtitle", { code: `MO-${booking.bookingId}` })
                                        : state === "slow"
                                          ? t("checkoutPayment.slowHint")
                                          : t("checkoutPayment.processingHint")
                                }
                            />

                            {invoice}
                            {backHome}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
