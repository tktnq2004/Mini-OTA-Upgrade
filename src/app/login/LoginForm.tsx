"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SocialAuthLinks from "@/components/auth/SocialAuthLinks";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

type Mode = "password" | "otp";
// "email" = chưa gửi mã; "otp" = đã gửi, chờ nhập mã — chỉ dùng khi mode==="otp".
type OtpStep = "email" | "otp";

export default function LoginForm() {
    const { t } = useLanguage();
    const { login, sendLoginOtp, loginWithOtp } = useAccount();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [mode, setMode] = useState<Mode>("password");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpStep, setOtpStep] = useState<OtpStep>("email");
    const [otp, setOtp] = useState("");
    // social_error: route callback cũ; error=oauth_failed: backend
    // (app.frontend.login-failed-url) khi Google login thất bại.
    const socialFailed =
        searchParams.get("social_error") !== null || searchParams.get("error") === "oauth_failed";
    const [error, setError] = useState(socialFailed ? t("auth.socialLoginError") : "");
    const [submitting, setSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [cooldown]);

    const switchMode = (next: Mode) => {
        setMode(next);
        setOtpStep("email");
        setOtp("");
        setError("");
    };

    const handlePasswordSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError(t("auth.loginErrorRequired"));
            return;
        }

        setSubmitting(true);
        const result = await login({ email, password });
        setSubmitting(false);
        if (!result.ok) {
            setError(result.message ?? t("auth.loginErrorRequired"));
            return;
        }
        router.push("/account");
    };

    const requestOtp = async () => {
        setError("");
        setSubmitting(true);
        const result = await sendLoginOtp(email);
        setSubmitting(false);
        if (!result.ok) {
            if (result.retryAfter) {
                setCooldown(result.retryAfter);
                setError(t("auth.otpErrorTooMany", { seconds: result.retryAfter }));
            } else {
                setError(result.message ?? t("auth.otpErrorSendFailed"));
            }
            return;
        }
        setOtp("");
        setOtpStep("otp");
        setCooldown(60);
    };

    const handleOtpEmailSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email) {
            setError(t("auth.loginErrorRequired"));
            return;
        }
        await requestOtp();
    };

    const handleOtpCodeSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        if (!otp.trim()) {
            setError(t("auth.otpErrorRequired"));
            return;
        }

        setSubmitting(true);
        const result = await loginWithOtp(email, otp.trim());
        setSubmitting(false);
        if (!result.ok) {
            setError(result.message ?? t("auth.loginErrorRequired"));
            return;
        }
        router.push("/account");
    };

    return (
        <AuthShell
            title={t("auth.loginTitle")}
            subtitle={
                mode === "otp" && otpStep === "otp"
                    ? `${t("auth.otpSentSubtitlePrefix")} ${email}`
                    : t("auth.loginSubtitle")
            }
            footer={
                <span>
                    {t("auth.noAccountYet")} <Link href="/signup">{t("nav.signup")}</Link>
                </span>
            }
        >
            {mode === "password" ? (
                <form className={form.form} onSubmit={handlePasswordSubmit}>
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
                        <Link href="/forgot-password" className={form.forgotPasswordLink}>
                            {t("auth.forgotPasswordLink")}
                        </Link>
                    </div>

                    {error && <p className={controls.error}>{error}</p>}

                    <button type="submit" className={controls.button} disabled={submitting}>
                        {submitting ? t("auth.submitting") : t("nav.login")}
                    </button>

                    <button
                        type="button"
                        className={form.forgotPasswordLink}
                        style={{ alignSelf: "center" }}
                        onClick={() => switchMode("otp")}
                    >
                        {t("auth.loginModeOtp")}
                    </button>
                </form>
            ) : otpStep === "email" ? (
                <form className={form.form} onSubmit={handleOtpEmailSubmit}>
                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="otpEmail">
                            Email
                        </label>
                        <input
                            id="otpEmail"
                            type="email"
                            className={controls.input}
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {error && <p className={controls.error}>{error}</p>}

                    <button type="submit" className={controls.button} disabled={submitting}>
                        {submitting ? t("auth.otpSending") : t("auth.otpSendButton")}
                    </button>

                    <button
                        type="button"
                        className={form.forgotPasswordLink}
                        style={{ alignSelf: "center" }}
                        onClick={() => switchMode("password")}
                    >
                        {t("auth.loginModePassword")}
                    </button>
                </form>
            ) : (
                <form className={form.form} onSubmit={handleOtpCodeSubmit}>
                    <p className={form.spamHint}>{t("auth.checkSpamWarning")}</p>

                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="loginOtp">
                            {t("auth.otpLabel")}
                        </label>
                        <input
                            id="loginOtp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            className={controls.input}
                            placeholder={t("auth.otpPlaceholder")}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                            autoFocus
                        />
                    </div>

                    {error && <p className={controls.error}>{error}</p>}

                    <button type="submit" className={controls.button} disabled={submitting}>
                        {submitting ? t("auth.submitting") : t("auth.loginOtpSubmit")}
                    </button>

                    <div className={form.checkboxRow} style={{ justifyContent: "space-between" }}>
                        <button
                            type="button"
                            className={controls.buttonGhost}
                            disabled={cooldown > 0 || submitting}
                            onClick={requestOtp}
                        >
                            {cooldown > 0 ? t("auth.otpResendIn", { seconds: cooldown }) : t("auth.otpResend")}
                        </button>
                        <button type="button" className={controls.buttonGhost} onClick={() => setOtpStep("email")}>
                            {t("auth.otpChangeEmail")}
                        </button>
                    </div>
                </form>
            )}

            {mode === "password" && (
                <>
                    <div className={form.divider}>
                        <span>{t("auth.or")}</span>
                    </div>

                    <SocialAuthLinks />
                </>
            )}
        </AuthShell>
    );
}
