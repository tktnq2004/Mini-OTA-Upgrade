"use client";

import { useRef, useState } from "react";
import { CreditCardIcon, HandCoinsIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import { FEATURES } from "@/lib/features";
import { CardPaymentError } from "@/lib/booking/payment";
import type { CreateBookingResult, PaymentMethod } from "@/lib/booking/resources";
import CardPayment, { type PaymentFormHandle } from "./PaymentForm";
import SePayPanel from "./SePayPanel";
import controls from "@/styles/controls.module.css";
import checkoutStyles from "../../checkout.module.css";
import styles from "../payment.module.css";

interface PaymentMethodSectionProps {
    booking: CreateBookingResult;
    grandTotal: number;
    billing: { name: string; email: string; phone: string };
    // paying nằm ở component cha: useBookingPayment cần biết để không khoá
    // trang (hết hạn giữ chỗ) giữa lúc đang confirm thẻ.
    paying: boolean;
    onPayingChange: (paying: boolean) => void;
    // Stripe.js confirm thẻ xong — cha chuyển sang "processing" + đối soát.
    onCardConfirmed: () => void;
    onPayAtHotelConfirmed: () => void;
}

// Phần chọn phương thức + trả tiền ở màn "selecting" của trang thanh toán.
export default function PaymentMethodSection({
    booking,
    grandTotal,
    billing,
    paying,
    onPayingChange,
    onCardConfirmed,
    onPayAtHotelConfirmed,
}: PaymentMethodSectionProps) {
    const { t } = useLanguage();
    // null = đang ở màn chọn.
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [payError, setPayError] = useState("");
    const paymentForm = useRef<PaymentFormHandle>(null);

    const handlePayNow = async () => {
        setPayError("");
        const cardError = paymentForm.current?.validate();
        if (cardError) {
            setPayError(cardError);
            return;
        }
        onPayingChange(true);
        try {
            const form = paymentForm.current;
            if (!form) throw new CardPaymentError("");
            await form.pay(booking.bookingId, billing);
            onCardConfirmed();
        } catch (err) {
            // Lỗi = "không thành công": chưa điều hướng đi đâu (vẫn ở
            // method==="card" trên chính trang này), chỉ hiện lỗi để thử lại.
            setPayError(err instanceof CardPaymentError && err.message ? err.message : t("checkout.errorPayment"));
        } finally {
            onPayingChange(false);
        }
    };

    const optionClass = (m: PaymentMethod) =>
        `${checkoutStyles.paymentOption} ${method === m ? checkoutStyles.paymentOptionActive : ""}`;

    return (
        <div className={styles.methodSection}>
            <h2 className={styles.methodSectionTitle}>{t("checkoutPayment.chooseMethodTitle")}</h2>

            <div className={checkoutStyles.paymentOptions}>
                <label className={optionClass("payAtHotel")}>
                    <input
                        type="radio"
                        name="paymentMethod"
                        checked={method === "payAtHotel"}
                        onChange={() => setMethod("payAtHotel")}
                    />
                    <HandCoinsIcon size={18} />
                    <span>{t("checkout.payAtHotel")}</span>
                </label>
                <label className={optionClass("card")}>
                    <input type="radio" name="paymentMethod" checked={method === "card"} onChange={() => setMethod("card")} />
                    <CreditCardIcon size={18} />
                    <span>{t("checkout.payByCard")}</span>
                </label>
                {FEATURES.momoPayment && (
                    <label className={optionClass("momo")}>
                        <input type="radio" name="paymentMethod" checked={method === "momo"} onChange={() => setMethod("momo")} />
                        <span className={checkoutStyles.momoBadge} aria-hidden="true">
                            mo
                        </span>
                        <span>{t("checkout.payByMomo")}</span>
                    </label>
                )}
                <label className={optionClass("bankTransfer")}>
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
                    <button type="button" className={controls.button} onClick={onPayAtHotelConfirmed}>
                        {t("checkoutPayment.confirmPayAtHotel")}
                    </button>
                </>
            )}

            {FEATURES.momoPayment && method === "momo" && (
                <p className={checkoutStyles.paymentNote}>{t("checkout.momoComingSoon")}</p>
            )}

            {method === "bankTransfer" && (
                // Không có nút "xác nhận" nào ở đây — khách tự chuyển khoản,
                // backend nhận webhook SePay (FE sẽ biết qua SSE sau).
                <SePayPanel bookingId={booking.bookingId} />
            )}

            {method === "card" && (
                <>
                    <CardPayment ref={paymentForm} />
                    {payError && <p className={controls.error}>{payError}</p>}
                    <button
                        type="button"
                        className={controls.button}
                        disabled={paying && !FEATURES.allowDoubleSubmit}
                        onClick={handlePayNow}
                    >
                        {paying ? t("checkout.submitting") : t("checkoutPayment.payNowButton", { total: formatVnd(grandTotal) })}
                    </button>
                </>
            )}

            {method && (
                <button type="button" className={styles.changeMethodButton} onClick={() => setMethod(null)}>
                    {t("checkoutPayment.changeMethod")}
                </button>
            )}
        </div>
    );
}
