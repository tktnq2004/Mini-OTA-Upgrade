"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { SocialLoginButtons } from "@/components/auth/social";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

// Backend yêu cầu username riêng (khác fullName) và phone đúng định dạng số
// (chỉ chữ số, 10-15 ký tự — xem ReqCreateUserDTO @Pattern) — form không có
// field username riêng nên tự sinh từ email (phần trước @, bỏ ký tự lạ) +
// hậu tố ngẫu nhiên để tránh trùng, người dùng không cần quan tâm khái niệm
// "username" (OTA thật cũng thường ẩn field này, chỉ cần email + mật khẩu).
function usernameFromEmail(email: string): string {
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "user";
    return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function SignupPage() {
    const { t } = useLanguage();
    const { register } = useAccount();
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!fullName || !email || !phone || !password || !confirmPassword) {
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

        // Khớp đúng regex backend (ReqCreateUserDTO.phone: ^\+?[0-9]{10,15}$) —
        // validate trước ở đây để báo lỗi ngay, khỏi vòng lên backend rồi mới biết sai.
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
            setError(t("auth.signupErrorPhone"));
            return;
        }

        if (!agreed) {
            setError(t("auth.signupErrorTerms"));
            return;
        }

        setSubmitting(true);
        const result = await register({
            fullName,
            username: usernameFromEmail(email),
            email,
            password,
            phone,
        });
        setSubmitting(false);
        if (!result.ok) {
            setError(result.message ?? t("auth.signupErrorRequired"));
            return;
        }
        router.push("/account");
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
                    {/* Backend bắt buộc phone (ReqCreateUserDTO @NotBlank + @Pattern
                        chỉ chữ số) — bỏ nhãn "không bắt buộc" cũ, không còn đúng. */}
                    <label className={controls.label} htmlFor="phone">
                        {t("auth.phoneLabel")}
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

                <button type="submit" className={controls.button} disabled={submitting}>
                    {submitting ? t("auth.submitting") : t("nav.signup")}
                </button>
            </form>

            <div className={form.divider}>
                <span>{t("auth.or")}</span>
            </div>

            <SocialLoginButtons googleText="signup_with" />
        </AuthShell>
    );
}
