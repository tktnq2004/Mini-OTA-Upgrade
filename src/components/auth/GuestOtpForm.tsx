"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCountdown } from "@/hooks/useCountdown";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";
import styles from "./GuestOtpForm.module.css";

type Step = "email" | "code";

interface GuestOtpFormProps {
    title?: string;
    hint?: string;
    // Email đã biết trước (checkout: khách vừa điền ở form) -> bỏ bước nhập
    // email, gửi mã ngay khi hiện ra, không cho đổi email ở đây.
    email?: string;
    // Họ tên/sđt khách vừa điền ở checkout — backend dùng khi email chưa có
    // tài khoản (tạo user GUEST lúc đặt phòng lần đầu).
    details?: { fullName: string; phone: string };
    submitLabel?: string;
    // Đúng OTP -> phiên đã có (cookie httpOnly, AccountProvider.user đã cập
    // nhật). Trả Promise thì nút vẫn "đang xử lý" tới khi xong (checkout tạo
    // booking ngay sau bước này).
    onVerified: () => void | Promise<void>;
    onCancel?: () => void;
    cancelLabel?: string;
}

// Xác minh email bằng OTP cho khách vãng lai — dùng ở checkout (trước khi
// giữ phòng), trang lịch sử đặt phòng và trang thanh toán (mở lại khi phiên
// đã hết / sang thiết bị khác). Không render khung card: chỗ dùng tự bọc.
export default function GuestOtpForm({
    title,
    hint,
    email: fixedEmail,
    details,
    submitLabel,
    onVerified,
    onCancel,
    cancelLabel,
}: GuestOtpFormProps) {
    const { t } = useLanguage();
    const { sendGuestOtp, verifyGuest } = useAccount();

    const [step, setStep] = useState<Step>(fixedEmail ? "code" : "email");
    const [email, setEmail] = useState(fixedEmail ?? "");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [cooldown, setCooldown] = useCountdown();

    const requestOtp = async (target: string) => {
        setError("");
        setSending(true);
        const result = await sendGuestOtp(target);
        setSending(false);
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
        setStep("code");
        setCooldown(60);
    };

    // Email cho sẵn -> gửi mã ngay 1 lần. Ref chặn gửi 2 lần khi StrictMode
    // chạy effect 2 lần ở dev (lần 2 sẽ dính 429).
    const autoSent = useRef(false);
    useEffect(() => {
        if (!fixedEmail || autoSent.current) return;
        autoSent.current = true;
        void requestOtp(fixedEmail);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ gửi 1 lần lúc hiện ra
    }, []);

    const handleEmailSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email.trim()) {
            setError(t("guestOtp.errorEmailRequired"));
            return;
        }
        await requestOtp(email.trim());
    };

    const handleCodeSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        if (!otp.trim()) {
            setError(t("auth.otpErrorRequired"));
            return;
        }

        setVerifying(true);
        const result = await verifyGuest({ email: email.trim(), otp: otp.trim(), ...details });
        if (!result.ok) {
            setVerifying(false);
            setError(result.message ?? t("guestOtp.errorVerify"));
            return;
        }
        try {
            await onVerified();
        } finally {
            setVerifying(false);
        }
    };

    const cancelButton = onCancel && (
        <button type="button" className={form.forgotPasswordLink} style={{ alignSelf: "center" }} onClick={onCancel}>
            {cancelLabel ?? t("guestOtp.cancel")}
        </button>
    );

    return (
        <div className={styles.wrap}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {hint && <p className={styles.hint}>{hint}</p>}

            {step === "email" ? (
                <form className={form.form} onSubmit={handleEmailSubmit}>
                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="guestOtpEmail">
                            Email
                        </label>
                        <input
                            id="guestOtpEmail"
                            type="email"
                            className={controls.input}
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {error && <p className={controls.error}>{error}</p>}

                    <button type="submit" className={controls.button} disabled={sending}>
                        {sending ? t("auth.otpSending") : t("auth.otpSendButton")}
                    </button>
                    {cancelButton}
                </form>
            ) : (
                <form className={form.form} onSubmit={handleCodeSubmit}>
                    <p className={styles.hint}>
                        {t("auth.otpSentSubtitlePrefix")} <strong>{email}</strong>
                    </p>
                    <p className={form.spamHint}>{t("auth.checkSpamWarning")}</p>

                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="guestOtpCode">
                            {t("auth.otpLabel")}
                        </label>
                        <input
                            id="guestOtpCode"
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

                    <button type="submit" className={controls.button} disabled={verifying || sending}>
                        {verifying ? t("auth.submitting") : (submitLabel ?? t("guestOtp.submit"))}
                    </button>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={controls.buttonGhost}
                            disabled={cooldown > 0 || sending || verifying}
                            onClick={() => requestOtp(email.trim())}
                        >
                            {cooldown > 0 ? t("auth.otpResendIn", { seconds: cooldown }) : t("auth.otpResend")}
                        </button>
                        {!fixedEmail && (
                            <button type="button" className={controls.buttonGhost} onClick={() => setStep("email")}>
                                {t("auth.otpChangeEmail")}
                            </button>
                        )}
                    </div>
                    {cancelButton}
                </form>
            )}
        </div>
    );
}
