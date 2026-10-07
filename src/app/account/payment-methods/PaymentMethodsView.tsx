"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCardIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
    AddAnotherCard,
    AddCardForm,
    NoCards,
    SavedCardRow,
    usePaymentAvailable,
    useSavedCards,
} from "@/components/payment/CardForms";
import cardStyles from "@/components/payment/cards.module.css";
import controls from "@/styles/controls.module.css";
import styles from "../account.module.css";

export default function PaymentMethodsView() {
    const { t } = useLanguage();
    const { user, ready } = useAccount();
    const router = useRouter();
    const available = usePaymentAvailable();
    const { cards, add, remove, error } = useSavedCards(Boolean(user));
    const [addOpen, setAddOpen] = useState(false);

    useEffect(() => {
        if (ready && !user) router.replace("/login");
    }, [ready, user, router]);

    return (
        <div className={styles.page}>
            <SiteHeader />
            <div className={styles.layout}>
                <div className={styles.header}>
                    <span className={styles.avatar}>
                        <CreditCardIcon size={20} weight="bold" />
                    </span>
                    <div>
                        <h1>{t("nav.paymentMethods")}</h1>
                        <p>{t("paymentMethods.subtitle")}</p>
                    </div>
                </div>

                <div className={styles.card}>
                    {!available ? (
                        <p className={cardStyles.note}>{t("paymentMethods.unavailable")}</p>
                    ) : !ready || !user || !cards ? (
                        <p className={cardStyles.note}>{t("checkout.cardsLoading")}</p>
                    ) : (
                        <div className={cardStyles.cardSection}>
                            <p className={cardStyles.cardSectionTitle}>{t("checkout.yourCards")}</p>

                            {cards.length === 0 && !addOpen && <NoCards onAdd={() => setAddOpen(true)} />}

                            {cards.map((c) => (
                                <SavedCardRow key={c.id} card={c} onRemove={remove} />
                            ))}

                            {error && <p className={controls.error}>{error}</p>}

                            {cards.length > 0 && !addOpen && <AddAnotherCard onAdd={() => setAddOpen(true)} />}

                            {addOpen && (
                                <AddCardForm
                                    onAdded={(card) => {
                                        add(card);
                                        setAddOpen(false);
                                    }}
                                    onCancel={() => setAddOpen(false)}
                                />
                            )}
                        </div>
                    )}
                </div>

                <p className={styles.hint}>{t("paymentMethods.securityNote")}</p>
            </div>
        </div>
    );
}
