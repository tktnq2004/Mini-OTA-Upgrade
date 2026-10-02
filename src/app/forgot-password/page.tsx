"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { sendForgotPasswordLink } from "@/lib/auth/resources";
import { AccountApiError } from "@/lib/auth/apiClient";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

// Backend KHÔNG giới hạn tần suất gọi /auth/forgot-password (khác OTP đăng
// ký, không có TooManyRequest) — cooldown 60s này thuần phía FE, chỉ để
// tránh bấm gửi liên tục khi nghi mail bị lỗi/chưa tới, không phải giới hạn
// thật của backend.
const RESEND_COOLDOWN = 60;

// Public — không cần đăng nhập. Backend luôn trả 200 dù email có tồn tại hay
// không (PasswordResetService.forgotPassword im lặng với email lạ, tránh lộ
// danh sách email đã đăng ký) nên UI chỉ có 1 trạng thái thành công chung,
// không phân biệt được "email đúng" với "email sai".
export default function ForgotPasswordPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [cooldown]);

    const send = async () => {
        setError("");
        setSubmitting(true);
        try {
            await sendForgotPasswordLink(email.trim());
            setSent(true);
            setCooldown(RESEND_COOLDOWN);
        } catch (e) {
            setError(e instanceof AccountApiError ? e.message : t("auth.otpErrorSendFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email.trim()) {
            setError(t("auth.forgotPasswordErrorRequired"));
            return;
        }
        await send();
    };

    return (
        <AuthShell
            title={t("auth.forgotPasswordTitle")}
            subtitle={sent ? t("auth.forgotPasswordSentTitle") : t("auth.forgotPasswordSubtitle")}
            footer={
                <span>
                    <Link href="/login">{t("auth.backToLogin")}</Link>
                </span>
            }
        >
            {sent ? (
                <div className={form.form}>
                    <p className={form.checkboxRow}>{t("auth.forgotPasswordSentBody")}</p>
                    <p className={form.spamHint}>{t("auth.checkSpamWarning")}</p>

                    {error && <p className={controls.error}>{error}</p>}

                    <button
                        type="button"
                        className={controls.buttonGhost}
                        disabled={cooldown > 0 || submitting}
                        onClick={send}
                    >
                        {submitting
                            ? t("auth.otpSending")
                            : cooldown > 0
                              ? t("auth.resendLinkIn", { seconds: cooldown })
                              : t("auth.resendLink")}
                    </button>
                </div>
            ) : (
                <form className={form.form} onSubmit={handleSubmit}>
                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="forgotEmail">
                            Email
                        </label>
                        <input
                            id="forgotEmail"
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
                        {submitting ? t("auth.otpSending") : t("auth.forgotPasswordSubmit")}
                    </button>
                </form>
            )}
        </AuthShell>
    );
}
