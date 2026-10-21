"use client";

import GuestsField from "@/components/GuestsField/GuestsField";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";

interface CustomerInfoSectionProps {
    fullName: string;
    onFullNameChange: (v: string) => void;
    email: string;
    onEmailChange: (v: string) => void;
    phone: string;
    onPhoneChange: (v: string) => void;
    note: string;
    onNoteChange: (v: string) => void;
    guests: number;
    onGuestsChange: (v: number) => void;
    maxGuests: number;
}

// Khối "Thông tin khách hàng" ở trang /checkout.
export default function CustomerInfoSection({
    fullName,
    onFullNameChange,
    email,
    onEmailChange,
    phone,
    onPhoneChange,
    note,
    onNoteChange,
    guests,
    onGuestsChange,
    maxGuests,
}: CustomerInfoSectionProps) {
    const { t } = useLanguage();

    return (
        <section className={styles.formSection}>
            <h2>{t("checkout.customerInfoTitle")}</h2>
            <p className={styles.sectionHint}>{t("checkout.customerInfoHint")}</p>

            <div className={styles.fieldRow}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="co-name">
                        {t("auth.fullNameLabel")}
                    </label>
                    <input
                        id="co-name"
                        type="text"
                        className={controls.input}
                        placeholder={t("auth.fullNamePlaceholder")}
                        value={fullName}
                        onChange={(e) => onFullNameChange(e.target.value)}
                    />
                </div>
                <GuestsField stacked value={guests} onChange={onGuestsChange} max={maxGuests} />
            </div>

            <div className={styles.fieldRow}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="co-email">
                        Email
                    </label>
                    <input
                        id="co-email"
                        type="email"
                        className={controls.input}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                    />
                </div>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="co-phone">
                        {t("auth.phoneLabel")}
                    </label>
                    <input
                        id="co-phone"
                        type="tel"
                        className={controls.input}
                        placeholder="09xx xxx xxx"
                        value={phone}
                        onChange={(e) => onPhoneChange(e.target.value)}
                    />
                </div>
            </div>

            <div className={controls.field}>
                <label className={controls.label} htmlFor="co-note">
                    {t("checkout.noteLabel")}
                </label>
                <textarea
                    id="co-note"
                    className={controls.textarea}
                    placeholder={t("checkout.notePlaceholder")}
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                />
            </div>
        </section>
    );
}
