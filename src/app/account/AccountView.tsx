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
    // Không phải mật khẩu MỚI — backend (UserService.update_own) dùng field
    // này để xác thực lại đúng mật khẩu HIỆN TẠI trước khi cho sửa bất kỳ
    // field nào. Đổi mật khẩu là API khác (/users/me/password), chưa nối FE.
    const [currentPassword, setCurrentPassword] = useState("");

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
        getMyProfile()
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
        if (!currentPassword) {
            setFormError(t("account.errorCurrentPasswordRequired"));
            return;
        }
        if (!user || !profile) return;

        setSaving(true);
        try {
            await updateMyProfile({ fullName, username, email, phone, password: currentPassword });
            // PUT /users/me/local trả về entity User thô (shape khác ResUser
            // của GET /users/me — xem ghi chú ở resources.ts) — gọi lại
            // getMyProfile() để đồng bộ đúng shape thay vì tin response PUT.
            const refreshed = await getMyProfile();
            setProfile(refreshed);
            setFullName(refreshed.fullName);
            setUsername(refreshed.username);
            setEmail(refreshed.email);
            setPhone(refreshed.phone);
            setCurrentPassword("");
            patchUser({ name: refreshed.fullName, email: refreshed.email });
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

                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="currentPassword">
                            {t("account.currentPasswordLabel")}
                        </label>
                        <input
                            id="currentPassword"
                            type="password"
                            className={controls.input}
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <span className={styles.hint}>{t("account.currentPasswordHint")}</span>
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
