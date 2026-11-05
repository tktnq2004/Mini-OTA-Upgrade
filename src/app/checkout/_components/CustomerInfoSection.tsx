"use client";

import type { FormEvent } from "react";
import GuestsField from "@/components/GuestsField/GuestsField";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import styles from "../checkout.module.css";

interface CustomerInfoSectionProps {
    formId: string;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    fullName: string;
    onFullNameChange: (v: string) => void;
    email: string;
    onEmailChange: (v: string) => void;
    // Đã có phiên: booking gắn theo tài khoản đó -> email cố định là email của
    // phiên (đổi email = phiên khác, phải đăng xuất).
    emailLocked?: boolean;
    // Đang nhập mã OTP: khoá họ tên/email/sđt — mã gửi theo đúng thông tin này.
    contactLocked?: boolean;
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
    formId,
    onSubmit,
    fullName,
    onFullNameChange,
    email,
    onEmailChange,
    emailLocked,
    contactLocked,
    phone,
    onPhoneChange,
    note,
    onNoteChange,
    guests,
    onGuestsChange,
    maxGuests,
}: CustomerInfoSectionProps) {
    const { t } = useLanguage();
    const contactInput = contactLocked ? `${controls.input} ${styles.inputLocked}` : controls.input;

    return (
        <form id={formId} className={styles.formSection} onSubmit={onSubmit}>
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
                        className={contactInput}
                        placeholder={t("auth.fullNamePlaceholder")}
                        value={fullName}
                        onChange={(e) => onFullNameChange(e.target.value)}
                        readOnly={contactLocked}
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
                        className={contactInput}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        readOnly={emailLocked || contactLocked}
                    />
                </div>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="co-phone">
                        {t("auth.phoneLabel")}
                    </label>
                    <input
                        id="co-phone"
                        type="tel"
                        className={contactInput}
                        placeholder="09xx xxx xxx"
                        value={phone}
                        onChange={(e) => onPhoneChange(e.target.value)}
                        readOnly={contactLocked}
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
        </form>
    );
}
