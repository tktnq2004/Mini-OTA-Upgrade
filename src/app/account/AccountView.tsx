"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircleIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AccountApiError } from "@/lib/auth/apiClient";
import { getMyProfile, updateMyProfile } from "@/lib/auth/resources";
import type { AccountProfile } from "@/lib/auth/types";
import controls from "@/styles/controls.module.css";
import styles from "./account.module.css";

export default function AccountView() {
    const { t } = useLanguage();
    const { user, ready, patchUser, logout } = useAccount();
    const router = useRouter();

    const [profile, setProfile] = useState<AccountProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [saving, setSaving] = useState(false);

    const loadProfile = () => {
        if (!ready) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        setLoading(true);
        getMyProfile(user.id)
            .then((p) => {
                setProfile(p);
                setFullName(p.fullName);
                setUsername(p.username);
                setEmail(p.email);
                setPhone(p.phone);
            })
            .catch((e) => setLoadError(e instanceof AccountApiError ? e.message : t("account.loadError")))
            .finally(() => setLoading(false));
    };

    useEffect(loadProfile, [ready, user, router, t]); // eslint-disable-line react-hooks/set-state-in-effect -- tải hồ sơ ban đầu từ API, một external system

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSuccessMessage("");

        if (!fullName || !username || !email || !phone) {
            setFormError(t("account.errorRequired"));
            return;
        }
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
            setFormError(t("auth.signupErrorPhone"));
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setFormError(t("auth.signupErrorMinLength"));
            return;
        }
        if (newPassword && newPassword !== confirmNewPassword) {
            setFormError(t("auth.signupErrorMismatch"));
            return;
        }
        if (!user || !profile) return;

        setSaving(true);
        try {
            const updated = await updateMyProfile(user.id, {
                fullName,
                username,
                email,
                phone,
                // Để trống thì KHÔNG gửi field password luôn (thay vì gửi
                // chuỗi rỗng) — khớp đúng "undefined = giữ nguyên" ở backend.
                ...(newPassword ? { password: newPassword } : {}),
            });
            setProfile(updated);
            setNewPassword("");
            setConfirmNewPassword("");
            patchUser({ name: updated.fullName, email: updated.email });
            setSuccessMessage(t("account.saveSuccess"));
        } catch (e) {
            setFormError(e instanceof AccountApiError ? e.message : t("account.saveError"));
        } finally {
            setSaving(false);
        }
    };

    if (!ready || loading) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout}>
                    <p className={styles.emptyState}>{t("account.loading")}</p>
                </div>
            </div>
        );
    }

    if (loadError || !profile) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout}>
                    <p className={controls.error}>{loadError || t("account.loadError")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <div className={styles.header}>
                    <span className={styles.avatar}>
                        <UserCircleIcon size={22} weight="bold" />
                    </span>
                    <div>
                        <h1>{t("account.title")}</h1>
                        <p>{t("account.subtitle")}</p>
                    </div>
                </div>

                <form className={styles.card} onSubmit={handleSubmit}>
                    <div className={styles.grid}>
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="fullName">
                                {t("auth.fullNameLabel")}
                            </label>
                            <input
                                id="fullName"
                                className={controls.input}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="username">
                                {t("account.usernameLabel")}
                            </label>
                            <input
                                id="username"
                                className={controls.input}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                className={controls.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="phone">
                                {t("auth.phoneLabel")}
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                className={controls.input}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <p className={styles.sectionLabel}>{t("account.passwordSection")}</p>
                    <div className={styles.grid}>
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="newPassword">
                                {t("account.newPasswordLabel")}
                            </label>
                            <input
                                id="newPassword"
                                type="password"
                                className={controls.input}
                                placeholder={t("account.newPasswordPlaceholder")}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="confirmNewPassword">
                                {t("auth.confirmPasswordLabel")}
                            </label>
                            <input
                                id="confirmNewPassword"
                                type="password"
                                className={controls.input}
                                placeholder="••••••••"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                autoComplete="new-password"
                                disabled={!newPassword}
                            />
                        </div>
                    </div>

                    {formError && <p className={controls.error}>{formError}</p>}
                    {successMessage && <p className={styles.success}>{successMessage}</p>}

                    <div className={styles.actions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? t("auth.submitting") : t("account.save")}
                        </button>
                        <button type="button" className={styles.logoutButton} onClick={() => logout()}>
                            {t("nav.logout")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
