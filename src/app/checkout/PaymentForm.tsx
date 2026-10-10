"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
    AddAnotherCard,
    AddCardForm,
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

export default function CardPayment({ ref }: { ref?: Ref<PaymentFormHandle> }) {
    const { t } = useLanguage();
    const available = usePaymentAvailable();

    if (!available) return <p className={styles.paymentNote}>{t("checkout.errorCardUnavailable")}</p>;
    return <CardChooser ref={ref} />;
}

const preferredCard = (list: SavedCard[]) => (list.find((c) => c.isDefault) ?? list[0])?.id ?? null;

// Giá trị radio "Dùng thẻ mới" (khác mọi id thẻ đã lưu).
const NEW_CARD = "new";

// Đã đăng nhập: "Thẻ của bạn" (chọn 1 thẻ đã lưu hoặc "Dùng thẻ mới" = nhập
// thẻ ngay trong <PaymentForm>, tick "Lưu thẻ" thì backend lưu luôn) + nút
// "Thêm thẻ" (thẻ thêm vào được lưu luôn vào tài khoản qua SetupIntent, xem
// AddCardForm). Khách vãng lai: chỉ có <PaymentForm>, thẻ dùng cho lần này.
function CardChooser({ ref }: { ref?: Ref<PaymentFormHandle> }) {
    const { t } = useLanguage();
    const { user } = useAccount();

    const { cards, add, remove, error: removeError } = useSavedCards(Boolean(user));
    const [picked, setPicked] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const newCard = useRef<PaymentFormHandle>(null);

    // Lựa chọn hiện tại: cái user bấm (nếu thẻ còn trong danh sách), không thì
    // thẻ mặc định / thẻ đầu, chưa có thẻ nào thì "Dùng thẻ mới" — gỡ đúng thẻ
    // đang chọn thì tự rơi về lựa chọn khác.
    const selected =
        picked === NEW_CARD || cards?.some((c) => c.id === picked)
            ? picked
            : ((cards && preferredCard(cards)) ?? NEW_CARD);
    const useNewCard = !user || selected === NEW_CARD;

    // Chỉ "Dùng thẻ mới" (và khách vãng lai) mới cần ô thẻ -> <Elements> bọc
    // riêng <PaymentForm>; thẻ đã lưu trả bằng stripe lấy thẳng từ stripePromise.
    // Bỏ chọn rồi chọn lại = mount lại, ô thẻ + checkbox về trạng thái đầu.
    const newCardForm = (
        <Elements stripe={stripePromise}>
            <PaymentForm ref={newCard} showSave={Boolean(user)} />
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
            if (useNewCard) return newCard.current ? newCard.current.validate() : t("checkout.errorCardUnavailable");
            return selected ? null : t("checkout.errorAddCard");
        },
        pay: async (bookingId, billing) => {
            if (useNewCard) {
                if (!newCard.current) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
                await newCard.current.pay(bookingId, billing);
                return;
            }
            const stripe = await stripePromise;
            if (!stripe) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
            if (!selected) throw new CardPaymentError(t("checkout.errorAddCard"));
            await payByCard({ stripe, method: { savedCardId: selected }, bookingId, billing });
        },
    }));

    if (!cards) return <p className={styles.paymentNote}>{t("checkout.cardsLoading")}</p>;

    if (!user) return newCardForm;

    return (
        <div className={cardStyles.cardSection}>
            <p className={cardStyles.cardSectionTitle}>{t("checkout.yourCards")}</p>

            {cards.length === 0 && !addOpen && <NoCards onAdd={() => setAddOpen(true)} />}

            {cards.map((c) => (
                <SavedCardRow
                    key={c.id}
                    card={c}
                    onRemove={remove}
                    select={{ checked: selected === c.id, onSelect: () => setPicked(c.id) }}
                />
            ))}

            <div className={`${cardStyles.newCardOption} ${useNewCard ? cardStyles.newCardOptionActive : ""}`}>
                <label className={cardStyles.newCardRadio}>
                    <input type="radio" name="savedCard" checked={useNewCard} onChange={() => setPicked(NEW_CARD)} />
                    {t("checkout.useNewCard")}
                </label>
                {useNewCard && newCardForm}
            </div>

            {removeError && <p className={controls.error}>{removeError}</p>}

            {cards.length > 0 && !addOpen && <AddAnotherCard onAdd={() => setAddOpen(true)} />}

            {addOpen && <AddCardForm onAdded={handleAdded} onCancel={() => setAddOpen(false)} />}
        </div>
    );
}

// "Dùng thẻ mới": số thẻ / hạn / CVC (+ "Lưu thẻ" khi đã đăng nhập). Phải nằm
// trong <Elements>; lấy ô số thẻ bằng elements.getElement(CardNumberElement).
// Trả: { bookingId, paymentMethodId: null, saveCard } -> clientSecret ->
// stripe.confirmCardPayment() với ô thẻ (xem payByCard).
function PaymentForm({ ref, showSave }: { ref?: Ref<PaymentFormHandle>; showSave: boolean }) {
    const { t } = useLanguage();
    const stripe = useStripe();
    const elements = useElements();
    const [status, setStatus] = useState<CardStatus>(EMPTY_CARD_STATUS);
    const [saveCard, setSaveCard] = useState(false);

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!stripe || !elements?.getElement(CardNumberElement)) return t("checkout.errorCardUnavailable");
            return fieldsError(status, t);
        },
        pay: async (bookingId, billing) => {
            const cardNumber = elements?.getElement(CardNumberElement);
            if (!stripe || !cardNumber) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
            await payByCard({
                stripe,
                method: { card: cardNumber, save: showSave && saveCard },
                bookingId,
                billing,
            });
        },
    }));

    return (
        <NewCardFields onChange={(field, next) => setStatus((prev) => ({ ...prev, [field]: next }))}>
            {showSave && (
                <label className={cardStyles.saveCardCheck}>
                    <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
                    {t("checkout.saveCard")}
                </label>
            )}
        </NewCardFields>
    );
}
