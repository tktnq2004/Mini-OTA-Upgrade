"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
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

export default function CardPayment({ ref }: { ref?: Ref<PaymentFormHandle> }) {
    const { t } = useLanguage();
    const available = usePaymentAvailable();

    if (!available) return <p className={styles.paymentNote}>{t("checkout.errorCardUnavailable")}</p>;
    return (
        <Elements stripe={stripePromise} options={{ fonts: CARD_FONTS, locale: "auto" }}>
            <PaymentForm ref={ref} />
        </Elements>
    );
}

const preferredCard = (list: SavedCard[]) => (list.find((c) => c.isDefault) ?? list[0])?.id ?? null;

// Đã đăng nhập: "Thẻ của bạn" + nút "Thêm thẻ" (thẻ thêm vào được lưu luôn
// vào tài khoản qua SetupIntent, xem AddCardForm). Khách vãng lai: nhập thẻ
// trực tiếp, chỉ dùng cho lần thanh toán này.
function PaymentForm({ ref }: { ref?: Ref<PaymentFormHandle> }) {
    const { t } = useLanguage();
    const { user } = useAccount();
    const stripe = useStripe();
    const elements = useElements();

    const { cards, add, remove, error: removeError } = useSavedCards(Boolean(user));
    const [picked, setPicked] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [status, setStatus] = useState<CardStatus>(EMPTY_CARD_STATUS); // ô thẻ của khách vãng lai

    // Thẻ đang chọn: thẻ user bấm (nếu còn trong danh sách), không thì thẻ
    // mặc định / thẻ đầu — gỡ đúng thẻ đang chọn thì tự rơi về thẻ khác.
    const selected = cards?.some((c) => c.id === picked) ? picked : cards ? preferredCard(cards) : null;

    const handleAdded = (card: SavedCard) => {
        add(card);
        setPicked(card.id);
        setAddOpen(false);
    };

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!stripe) return t("checkout.errorCardUnavailable");
            if (user) {
                if (addOpen) return t("checkout.errorFinishAddCard");
                return selected ? null : t("checkout.errorAddCard");
            }
            if (!elements?.getElement(CardNumberElement)) return t("checkout.errorCardUnavailable");
            return fieldsError(status, t);
        },
        pay: async (bookingId, billing) => {
            if (!stripe) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
            if (user) {
                if (!selected) throw new CardPaymentError(t("checkout.errorAddCard"));
                await payByCard({ stripe, method: { savedCardId: selected }, bookingId, billing });
                return;
            }
            const card = elements?.getElement(CardNumberElement);
            if (!card) throw new CardPaymentError(t("checkout.errorCardUnavailable"));
            await payByCard({ stripe, method: { card }, bookingId, billing });
        },
    }));

    if (!cards) return <p className={styles.paymentNote}>{t("checkout.cardsLoading")}</p>;

    if (!user) {
        return <NewCardFields onChange={(field, next) => setStatus((prev) => ({ ...prev, [field]: next }))} />;
    }

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

            {removeError && <p className={controls.error}>{removeError}</p>}

            {cards.length > 0 && !addOpen && <AddAnotherCard onAdd={() => setAddOpen(true)} />}

            {addOpen && <AddCardForm onAdded={handleAdded} onCancel={() => setAddOpen(false)} />}
        </div>
    );
}
