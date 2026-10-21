"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { bookingPayable } from "@/lib/booking/resources";
import controls from "@/styles/controls.module.css";
import checkoutStyles from "../checkout.module.css";
import styles from "./payment.module.css";
import PaymentSkeleton from "./PaymentSkeleton";
import { useBookingPayment } from "./useBookingPayment";
import InvoiceBlock from "./InvoiceBlock";
import StatusHeader from "./StatusHeader";
import HoldCountdown from "./HoldCountdown";
import PaymentMethodSection from "./PaymentMethodSection";

// Trang /checkout/payment?bookingId=&email=: tra booking rồi hiện đúng màn theo
// trạng thái. Logic trạng thái nằm ở useBookingPayment; file này chỉ chọn màn.
export default function PaymentView() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();

    const bookingId = Number(searchParams.get("bookingId")) || null;
    const email = searchParams.get("email") || "";
    const fullName = searchParams.get("fullName") || "";
    const phone = searchParams.get("phone") || "";

    const [paying, setPaying] = useState(false);
    // Màn thành công có câu chữ riêng cho "thanh toán tại khách sạn".
    const [paidAtHotel, setPaidAtHotel] = useState(false);

    const { booking, state, errorMessage, hasDeadline, remainingMs, holdExpired, startCardSync, markPayAtHotelConfirmed } =
        useBookingPayment({ bookingId, email, paying });

    const invoice = booking && (
        <InvoiceBlock booking={booking} email={email} fallbackFullName={fullName} fallbackPhone={phone} />
    );
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
                                    billing={{ name: fullName, email, phone }}
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
