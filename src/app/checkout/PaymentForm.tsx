"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { Elements, useElements } from "@stripe/react-stripe-js";
import type { StripeCardNumberElement } from "@stripe/stripe-js";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
    AddAnotherCard,
    AddCardForm,
    CARD_FONTS,
    EMPTY_CARD_STATUS,
    NewCardFields,
    NoCards,
    SavedCardRow,
    fieldsError,
    usePaymentAvailable,
    useSavedCards,
    type CardStatus,
} from "@/components/payment/CardForms";
import cardStyles from "@/components/payment/cards.module.css";
import { CardPaymentError, payByCard, stripePromise, type SavedCard } from "@/lib/booking/payment";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";

// CheckoutView gọi qua ref: validate() trước khi tạo booking, pay() sau khi
// có bookingId (clientSecret xin lúc pay, không cần có sẵn khi hiện ô thẻ).
export interface PaymentFormHandle {
    validate: () => string | null;
    pay: (bookingId: number, billing: { name: string; email: string; phone: string }) => Promise<void>;
}

// amount = tổng tiền đơn (VND không có phần lẻ nên truyền thẳng), đổi ngày ->
// amount đổi -> <Elements> của ô thẻ tự cập nhật.
interface CardPaymentProps {
    ref?: Ref<PaymentFormHandle>;
    amount: number;
}

export default function CardPayment({ ref, amount }: CardPaymentProps) {
    const { t } = useLanguage();
    const available = usePaymentAvailable();

    if (!available) return <p className={styles.paymentNote}>{t("checkout.errorCardUnavailable")}</p>;
    return <PaymentForm ref={ref} amount={amount} />;
}

// <Elements> của ô thẻ không truyền options: đặt hết ở đây qua elements.update().
// Đổi ngày trên lịch -> tổng tiền đổi -> amount mới được đẩy vào <Elements>.
function ElementsAmount({ amount }: { amount: number }) {
    const elements = useElements();
    useEffect(() => {
        if (!elements) return;
        elements.update({ mode: "payment", currency: "vnd", amount, fonts: CARD_FONTS, locale: "auto" });
        console.log("[card elements] amount changed ->", amount); // TEST: xoá khi test xong
    }, [elements, amount]);
    return null;
}

const preferredCard = (list: SavedCard[]) => (list.find((c) => c.isDefault) ?? list[0])?.id ?? null;

// Giá trị radio "Dùng thẻ mới" (khác mọi id thẻ đã lưu).
const NEW_CARD = "new";

// Đã đăng nhập: "Thẻ của bạn" (chọn 1 thẻ đã lưu hoặc "Dùng thẻ mới" = nhập
// thẻ ngay, tick "Lưu thẻ" thì lưu luôn vào tài khoản — xem payByCard) + nút
// "Thêm thẻ" (thẻ thêm vào được lưu luôn vào tài khoản qua SetupIntent, xem
// AddCardForm). Khách vãng lai: nhập thẻ
// trực tiếp, chỉ dùng cho lần thanh toán này.
function PaymentForm({ ref, amount }: CardPaymentProps) {
    const { t } = useLanguage();
    const { user } = useAccount();

    const { cards, add, remove, error: removeError } = useSavedCards(Boolean(user));
    const [picked, setPicked] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [status, setStatus] = useState<CardStatus>(EMPTY_CARD_STATUS); // ô thẻ mới
    const [saveCard, setSaveCard] = useState(false);
    // Ô số thẻ của "Dùng thẻ mới" (nằm trong <Elements> riêng, xem newCardFields).
    const cardElement = useRef<StripeCardNumberElement | null>(null);

    // Lựa chọn hiện tại: cái user bấm (nếu thẻ còn trong danh sách), không thì
    // thẻ mặc định / thẻ đầu, chưa có thẻ nào thì "Dùng thẻ mới" — gỡ đúng thẻ
    // đang chọn thì tự rơi về lựa chọn khác.
    const selected =
        picked === NEW_CARD || cards?.some((c) => c.id === picked)
            ? picked
            : ((cards && preferredCard(cards)) ?? NEW_CARD);
    const useNewCard = !user || selected === NEW_CARD;

    const pickNewCard = () => {
        // Ô thẻ mount lại: trạng thái + ô số thẻ cũ không còn đúng.
        setStatus(EMPTY_CARD_STATUS);
        cardElement.current = null;
        setPicked(NEW_CARD);
    };

    // Chỉ "Dùng thẻ mới" (và khách vãng lai) mới cần ô thẻ -> <Elements> bọc
    // riêng 3 ô; thẻ đã lưu trả bằng stripe lấy thẳng từ stripePromise.
    // Chưa chọn ngày = chưa có số tiền, cổng không nhận amount 0.
    const newCardFields = (children?: ReactNode) =>
        amount <= 0 ? (
            <p className={styles.paymentNote}>{t("checkout.pickDatesForCard")}</p>
        ) : (
                <Elements stripe={stripePromise}>
                    <ElementsAmount amount={amount} />
                    <NewCardFields
                        onChange={(field, next) => setStatus((prev) => ({ ...prev, [field]: next }))}
                        onNumberReady={(el) => (cardElement.current = el)}
                    >
                        {children}
                    </NewCardFields>
                    
                </Elements>
        );

    const handleAdded = (card: SavedCard) => {
        add(card);
        setPicked(card.id);
        setAddOpen(false);
    };

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (user && addOpen) return t("checkout.errorFinishAddCard");
            if (!useNewCard) return selected ? null : t("checkout.errorAddCard");
            if (!cardElement.current) return t("checkout.errorCardUnavailable");
            return fieldsError(status, t);
        },
        pay: async (bookingId, billing) => {
            const stripe = await stripePromise;
            if (!stripe) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
            if (!useNewCard) {
                if (!selected) throw new CardPaymentError(t("checkout.errorAddCard"));
                await payByCard({
                    stripe,
                    method: { savedCardId: selected },
                    bookingId,
                    billing,
                });
                return;
            }
            const card = cardElement.current;
            if (!card) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
            await payByCard({
                stripe,
                method: { card, save: Boolean(user) && saveCard },
                bookingId,
                billing,
            });
        },
    }));

    if (!cards) return <p className={styles.paymentNote}>{t("checkout.cardsLoading")}</p>;

    if (!user) return newCardFields();

    return (
        <div className={cardStyles.cardSection}>
            <p className={cardStyles.cardSectionTitle}>{t("checkout.yourCards")}</p>

            {cards.length === 0 && !addOpen && <NoCards onAdd={() => setAddOpen(true)} />}

            {cards.map((c) => (
                <SavedCardRow
                    key={c.id}
                    card={c}
                    onRemove={remove}
                    select={{
                        checked: selected === c.id,
                        onSelect: () => setPicked(c.id),
                    }}
                />
            ))}

            <div className={`${cardStyles.newCardOption} ${useNewCard ? cardStyles.newCardOptionActive : ""}`}>
                <label className={cardStyles.newCardRadio}>
                    <input type="radio" name="savedCard" checked={useNewCard} onChange={pickNewCard} />
                    {t("checkout.useNewCard")}
                </label>
                {useNewCard &&
                    newCardFields(
                        <label className={cardStyles.saveCardCheck}>
                            <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
                            {t("checkout.saveCard")}
                        </label>,
                    )}
            </div>

            {removeError && <p className={controls.error}>{removeError}</p>}

            {cards.length > 0 && !addOpen && <AddAnotherCard onAdd={() => setAddOpen(true)} />}

            {addOpen && <AddCardForm onAdded={handleAdded} onCancel={() => setAddOpen(false)} />}
        </div>
    );
}
