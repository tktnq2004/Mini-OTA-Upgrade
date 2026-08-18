"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { FacebookLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import AuthShell from "@/components/auth/AuthShell";
import { useSocialAuth } from "@/components/auth/useSocialAuth";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

export default function LoginPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { loginFacebook, loginGoogle } = useSocialAuth();

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError(t("auth.loginErrorRequired"));
            return;
        }

        console.log("Login with email:", { email, password });
        // TODO(backend): sau khi xác thực thành công thật sự, gọi
        // mergeCartOnLogin(cart.items) từ "@/components/cart/cartStorage" để gộp
        // giỏ phòng đang lưu tạm (localStorage) vào tài khoản vừa đăng nhập.
    };

    return (
        <AuthShell
            title={t("auth.loginTitle")}
            subtitle={t("auth.loginSubtitle")}
            footer={
                <span>
                    {t("auth.noAccountYet")} <Link href="/signup">{t("nav.signup")}</Link>
                </span>
            }
        >
            <form className={form.form} onSubmit={handleSubmit}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        className={controls.input}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className={controls.field}>
                    <label className={controls.label} htmlFor="password">
                        {t("auth.passwordLabel")}
                    </label>
                    <input
                        id="password"
                        type="password"
                        className={controls.input}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && <p className={controls.error}>{error}</p>}

                <button type="submit" className={controls.button}>
                    {t("nav.login")}
                </button>
            </form>

            <div className={form.divider}>
                <span>{t("auth.or")}</span>
            </div>

            <div className={form.socialRow}>
                <button type="button" className={form.socialButton} onClick={loginFacebook}>
                    <FacebookLogoIcon size={18} weight="fill" />
                    {t("auth.loginWithFacebook")}
                </button>
                <button type="button" className={form.socialButton} onClick={loginGoogle}>
                    <GoogleLogoIcon size={18} weight="bold" />
                    {t("auth.loginWithGoogle")}
                </button>
            </div>
        </AuthShell>
    );
}
