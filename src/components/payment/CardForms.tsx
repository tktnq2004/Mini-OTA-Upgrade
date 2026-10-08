"use client";

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeCardNumberElement, StripeElementChangeEvent } from "@stripe/stripe-js";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
    CardPaymentError,
    createCardSetup,
    listSavedCards,
    removeSavedCard,
    stripePromise,
    type SavedCard,
} from "@/lib/booking/payment";
import controls from "@/styles/controls.module.css";
import styles from "./cards.module.css";

// Dùng chung cho checkout (chọn thẻ để trả) và /account/payment-methods
// (quản lý thẻ): ô nhập thẻ, form "Thêm thẻ", hàng thẻ đã lưu + nút gỡ.

// Font Inter cho các ô thẻ bảo mật (iframe không dùng được next/font của trang).
export const CARD_FONTS = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" }];

export type CardField = "number" | "expiry" | "cvc";
export type CardStatus = Record<CardField, { complete: boolean; error?: string }>;

export const EMPTY_CARD_STATUS: CardStatus = {
    number: { complete: false },
    expiry: { complete: false },
    cvc: { complete: false },
};

const BRAND_LABEL: Record<string, string> = {
    visa: "VISA",
    mastercard: "Mastercard",
    amex: "American Express",
    jcb: "JCB",
    unionpay: "UnionPay",
    discover: "Discover",
    diners: "Diners Club",
};

export function fieldsError(status: CardStatus, t: (key: string) => string): string | null {
    const fields = Object.values(status);
    const fieldError = fields.find((f) => f.error)?.error;
    if (fieldError) return fieldError;
    if (fields.some((f) => !f.complete)) return t("checkout.errorCardRequired");
    return null;
}

// Script cổng thanh toán bị chặn (trình chặn quảng cáo, mạng...) hoặc thiếu
// khoá -> false, để UI báo ngay thay vì hiện form rỗng.
export function usePaymentAvailable(): boolean {
    const [available, setAvailable] = useState(Boolean(stripePromise));
    useEffect(() => {
        let alive = true;
        stripePromise
            ?.then((stripe) => {
                if (alive && !stripe) setAvailable(false);
            })
            .catch(() => {
                if (alive) setAvailable(false);
            });
        return () => {
            alive = false;
        };
    }, []);
    return available;
}

// Thẻ đã lưu của user đang đăng nhập (enabled=false -> danh sách rỗng, không gọi API).
export function useSavedCards(enabled: boolean) {
    const { t } = useLanguage();
    const [cards, setCards] = useState<SavedCard[] | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        (enabled ? listSavedCards() : Promise.resolve([]))
            .catch(() => [])
            .then((list) => {
                if (alive) setCards(list);
            });
        return () => {
            alive = false;
        };
    }, [enabled]);

    const add = (card: SavedCard) => setCards((prev) => [...(prev ?? []).filter((c) => c.id !== card.id), card]);

    // Trả danh sách còn lại khi gỡ được, null khi lỗi (lỗi nằm ở `error`).
    const remove = async (id: string): Promise<SavedCard[] | null> => {
        setError("");
        try {
            await removeSavedCard(id);
            const rest = (cards ?? []).filter((c) => c.id !== id);
            setCards(rest);
            return rest;
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : t("checkout.errorRemoveCard"));
            return null;
        }
    };

    return { cards, add, remove, error };
}

interface SavedCardRowProps {
    card: SavedCard;
    onRemove: (id: string) => Promise<unknown>;
    // Có = hàng chọn được (radio, checkout); không = chỉ hiển thị (quản lý thẻ).
    select?: { checked: boolean; onSelect: () => void };
}

export function SavedCardRow({ card, onRemove, select }: SavedCardRowProps) {
    const { t } = useLanguage();
    const [confirming, setConfirming] = useState(false);
    const [removing, setRemoving] = useState(false);

    // Nút nằm trong <label> của hàng chọn được: chặn để bấm nút không chọn luôn thẻ.
    const stop = (fn: () => void) => (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
    };

    const handleRemove = async () => {
        setRemoving(true);
        try {
            await onRemove(card.id);
        } finally {
            setRemoving(false);
            setConfirming(false);
        }
    };

    const content = (
        <>
            {select && <input type="radio" name="savedCard" checked={select.checked} onChange={select.onSelect} />}
            <span className={styles.savedCardBrand}>{BRAND_LABEL[card.brand] ?? card.brand.toUpperCase()}</span>
            <span className={styles.savedCardNumber}>•••• {card.last4}</span>
            <span className={styles.savedCardMeta}>
                {t("checkout.cardExpires", {
                    date: `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`,
                })}
            </span>
            {card.isDefault && <span className={styles.savedCardDefault}>{t("checkout.cardDefault")}</span>}
            <span className={styles.savedCardActions}>
                {confirming ? (
                    <>
                        <span className={styles.removeQuestion}>{t("checkout.removeCardConfirm")}</span>
                        <button
                            type="button"
                            className={styles.removeCardButton}
                            disabled={removing}
                            onClick={stop(handleRemove)}
                        >
                            {removing ? t("checkout.removingCard") : t("checkout.removeCard")}
                        </button>
                        <button
                            type="button"
                            className={styles.keepCardButton}
                            disabled={removing}
                            onClick={stop(() => setConfirming(false))}
                        >
                            {t("checkout.keepCard")}
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className={styles.removeCardIcon}
                        aria-label={t("checkout.removeCardAria", { last4: card.last4 })}
                        title={t("checkout.removeCard")}
                        onClick={stop(() => setConfirming(true))}
                    >
                        <TrashIcon size={15} />
                    </button>
                )}
            </span>
        </>
    );

    if (!select) return <div className={`${styles.savedCard} ${styles.savedCardStatic}`}>{content}</div>;
    return (
        <label className={`${styles.savedCard} ${select.checked ? styles.savedCardActive : ""}`}>{content}</label>
    );
}

// Ô trống "Bạn chưa lưu thẻ nào" + nút "Thêm thẻ".
export function NoCards({ onAdd }: { onAdd: () => void }) {
    const { t } = useLanguage();
    return (
        <div className={styles.noCards}>
            <p>{t("checkout.noCards")}</p>
            <button type="button" className={styles.addCardButton} onClick={onAdd}>
                <PlusIcon size={14} weight="bold" />
                {t("checkout.addCard")}
            </button>
        </div>
    );
}

// Link "+ Thêm thẻ" dưới danh sách thẻ.
export function AddAnotherCard({ onAdd }: { onAdd: () => void }) {
    const { t } = useLanguage();
    return (
        <button type="button" className={styles.addAnotherCard} onClick={onAdd}>
            <PlusIcon size={14} weight="bold" />
            {t("checkout.addCard")}
        </button>
    );
}

interface AddCardProps {
    onAdded: (card: SavedCard) => void;
    onCancel: () => void;
}

// "Thêm thẻ": xin clientSecret của SetupIntent từ backend rồi mở form thẻ
// trong <Elements options={{ clientSecret }}> riêng. Mỗi lần mở = 1 SetupIntent.
export function AddCardForm({ onAdded, onCancel }: AddCardProps) {
    const { t } = useLanguage();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        createCardSetup()
            .then((secret) => {
                if (alive) setClientSecret(secret);
            })
            .catch((e) => {
                if (alive) setError(e instanceof Error && e.message ? e.message : t("checkout.errorAddCardFailed"));
            });
        return () => {
            alive = false;
        };
    }, [t]);

    if (!clientSecret) {
        return (
            <div className={styles.cardFields}>
                {error ? <p className={controls.error}>{error}</p> : <p className={styles.note}>{t("checkout.addCardLoading")}</p>}
                <button type="button" className={styles.cancelNewCard} onClick={onCancel}>
                    {t("checkout.cancelAddCard")}
                </button>
            </div>
        );
    }

    return (
        <Elements stripe={stripePromise} options={{ clientSecret, fonts: CARD_FONTS, locale: "auto" }}>
            <AddCardFields clientSecret={clientSecret} onAdded={onAdded} onCancel={onCancel} />
        </Elements>
    );
}

function AddCardFields({ clientSecret, onAdded, onCancel }: AddCardProps & { clientSecret: string }) {
    const { t } = useLanguage();
    const stripe = useStripe();
    const elements = useElements();
    const [status, setStatus] = useState<CardStatus>(EMPTY_CARD_STATUS);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const card = elements?.getElement(CardNumberElement);
        if (!stripe || !card) {
            setError(t("checkout.errorCardUnavailable"));
            return;
        }
        const fieldError = fieldsError(status, t);
        if (fieldError) {
            setError(fieldError);
            return;
        }
        setSaving(true);
        setError("");
        try {
            // Tạo payment method trước để có brand/4 số cuối hiển thị, rồi
            // xác nhận SetupIntent với nó -> thẻ được gắn vào tài khoản.
            const created = await stripe.createPaymentMethod({ type: "card", card });
            if (created.error || !created.paymentMethod.card) throw new CardPaymentError(created.error?.message || "");
            const pm = created.paymentMethod;
            const setup = await stripe.confirmCardSetup(clientSecret, { payment_method: pm.id });
            if (setup.error) throw new CardPaymentError(setup.error.message || "");
            if (setup.setupIntent.status !== "succeeded") throw new CardPaymentError("");
            console.log("[add card] setup succeeded", {
                setupIntentId: setup.setupIntent.id,
                status: setup.setupIntent.status,
                paymentMethodId: pm.id,
                brand: pm.card!.brand,
                last4: pm.card!.last4,
                exp: `${pm.card!.exp_month}/${pm.card!.exp_year}`,
                setupIntent: setup.setupIntent,
            });
            onAdded({
                id: pm.id,
                brand: pm.card!.brand,
                last4: pm.card!.last4,
                expMonth: pm.card!.exp_month,
                expYear: pm.card!.exp_year,
            });
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : t("checkout.errorAddCardFailed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <NewCardFields
            onChange={(field, next) => {
                setError("");
                setStatus((prev) => ({ ...prev, [field]: next }));
            }}
        >
            {error && <p className={controls.error}>{error}</p>}
            <div className={styles.newCardActions}>
                <button type="button" className={styles.addCardButton} onClick={handleSave} disabled={saving}>
                    <PlusIcon size={14} weight="bold" />
                    {saving ? t("checkout.addingCard") : t("checkout.addCard")}
                </button>
                <button type="button" className={styles.cancelNewCard} onClick={onCancel} disabled={saving}>
                    {t("checkout.cancelAddCard")}
                </button>
            </div>
        </NewCardFields>
    );
}

// Ô thẻ chạy trong iframe bảo mật của cổng thanh toán nên không đọc được CSS
// của trang: lấy màu từ biến CSS hiện tại truyền vào style, đổi theme thì tính lại.
function readFieldStyle() {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    return {
        base: {
            color: v("--color-text"),
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            fontSize: "13.5px",
            fontSmoothing: "antialiased",
            iconColor: v("--color-text-muted"),
            "::placeholder": { color: v("--color-text-faint") },
        },
        invalid: { color: v("--color-error"), iconColor: v("--color-error") },
    };
}

// Số thẻ / hạn / CVC. Phải nằm trong 1 <Elements>. onNumberReady: trả ô số
// thẻ ra ngoài cho chỗ nằm ngoài <Elements> này (không dùng được useElements).
export function NewCardFields({
    onChange,
    onNumberReady,
    children,
}: {
    onChange: (field: CardField, status: CardStatus[CardField]) => void;
    onNumberReady?: (element: StripeCardNumberElement) => void;
    children?: ReactNode;
}) {
    const { t } = useLanguage();
    const { theme } = useTheme();

    // ThemeProvider đã set data-theme trên <html> trước khi ô thẻ hiện ra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const style = useMemo(() => readFieldStyle(), [theme]);

    const fieldClasses = { base: styles.cardInput, focus: styles.cardInputFocus, invalid: styles.cardInputInvalid };
    const handle = (field: CardField) => (e: StripeElementChangeEvent) =>
        onChange(field, { complete: e.complete, error: e.error?.message });

    return (
        <div className={styles.cardFields}>
            <div className={controls.field}>
                <label className={controls.label}>{t("checkout.cardNumber")}</label>
                <CardNumberElement
                    options={{ style, classes: fieldClasses, placeholder: "4242 4242 4242 4242", disableLink: true }}
                    onChange={handle("number")}
                    onReady={onNumberReady}
                />
            </div>
            <div className={styles.fieldRow}>
                <div className={controls.field}>
                    <label className={controls.label}>{t("checkout.cardExpiry")}</label>
                    <CardExpiryElement
                        options={{ style, classes: fieldClasses, placeholder: "MM/YY" }}
                        onChange={handle("expiry")}
                    />
                </div>
                <div className={controls.field}>
                    <label className={controls.label}>CVC</label>
                    <CardCvcElement
                        options={{ style, classes: fieldClasses, placeholder: "123" }}
                        onChange={handle("cvc")}
                    />
                </div>
            </div>
            {children}
        </div>
    );
}
