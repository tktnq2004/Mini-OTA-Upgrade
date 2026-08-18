"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { FacebookLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import AuthShell from "@/components/auth/AuthShell";
import { useSocialAuth } from "@/components/auth/useSocialAuth";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

export default function SignupPage() {
    const { t } = useLanguage();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState("");
    const { loginFacebook, loginGoogle } = useSocialAuth();

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!fullName || !email || !password || !confirmPassword) {
            setError(t("auth.signupErrorRequired"));
            return;
        }

        if (password.length < 6) {
            setError(t("auth.signupErrorMinLength"));
            return;
        }

        if (password !== confirmPassword) {
            setError(t("auth.signupErrorMismatch"));
            return;
        }

        if (!agreed) {
            setError(t("auth.signupErrorTerms"));
            return;
        }

        console.log("Sign up with:", { fullName, email, phone, password });
        // TODO(backend): sau khi tạo tài khoản thành công thật sự, gọi
        // mergeCartOnLogin(cart.items) từ "@/components/cart/cartStorage" để gộp
        // giỏ phòng đang lưu tạm (localStorage) vào tài khoản vừa tạo.
    };

    return (
        <AuthShell
            title={t("auth.signupTitle")}
            subtitle={t("auth.signupSubtitle")}
            footer={
                <span>
                    {t("auth.haveAccountAlready")} <Link href="/login">{t("nav.login")}</Link>
                </span>
            }
        >
            <form className={form.form} onSubmit={handleSubmit}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="fullName">
                        {t("auth.fullNameLabel")}
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        className={controls.input}
                        placeholder={t("auth.fullNamePlaceholder")}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                </div>

                <div className={controls.field}>
                    <label className={controls.label} htmlFor="signupEmail">
                        Email
                    </label>
                    <input
                        id="signupEmail"
                        type="email"
                        className={controls.input}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className={controls.field}>
                    <label className={controls.label} htmlFor="phone">
                        {t("auth.phoneLabel")} <span>{t("auth.optional")}</span>
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        className={controls.input}
                        placeholder="09xx xxx xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <div className={controls.field}>
                    <label className={controls.label} htmlFor="signupPassword">
                        {t("auth.passwordLabel")}
                    </label>
                    <input
                        id="signupPassword"
                        type="password"
                        className={controls.input}
                        placeholder={t("auth.minLengthPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className={controls.field}>
                    <label className={controls.label} htmlFor="confirmPassword">
                        {t("auth.confirmPasswordLabel")}
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={controls.input}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <label className={form.checkboxRow} htmlFor="agree">
                    <input
                        id="agree"
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span>
                        {t("auth.agreeTermsPrefix")} <strong>{t("auth.termsOfService")}</strong>{" "}
                        {t("auth.and")} <strong>{t("auth.privacyPolicy")}</strong>{" "}
                        {t("auth.ofWenGo")}
                    </span>
                </label>

                {error && <p className={controls.error}>{error}</p>}

                <button type="submit" className={controls.button}>
                    {t("nav.signup")}
                </button>
            </form>

            <div className={form.divider}>
                <span>{t("auth.or")}</span>
            </div>

            <div className={form.socialRow}>
                <button type="button" className={form.socialButton} onClick={loginFacebook}>
                    <FacebookLogoIcon size={18} weight="fill" />
                    {t("auth.signupWithFacebook")}
                </button>
                <button type="button" className={form.socialButton} onClick={loginGoogle}>
                    <GoogleLogoIcon size={18} weight="bold" />
                    {t("auth.signupWithGoogle")}
                </button>
            </div>
        </AuthShell>
    );
}
