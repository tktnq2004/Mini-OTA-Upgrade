"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { resetPassword, verifyResetToken } from "@/lib/auth/resources";
import { AccountApiError } from "@/lib/auth/apiClient";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

// Khớp đúng regex backend (ReqPasswordChangeDTO: @Size(min=8) + ít nhất 1
// chữ và 1 số) — validate trước ở đây để báo lỗi ngay, khỏi vòng lên backend.
const STRONG_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

type Status = "verifying" | "invalid" | "ready" | "done";

// Trang đích của cả 2 luồng: quên mật khẩu (chưa đăng nhập) và tự đổi mật
// khẩu (đã đăng nhập, bấm nút ở trang tài khoản) — PasswordResetService bên
// backend tự phân biệt qua chính token. Có link (= đã xác minh qua email) là
// đủ, FE không hỏi thêm mật khẩu hiện tại ở cả 2 trường hợp.
export default function ResetPasswordView() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";

    // Không có token thì không cần hỏi backend gì cả — suy ra ngay lúc khởi
    // tạo state thay vì set trong effect (tránh render thừa 1 nhịp).
    const [status, setStatus] = useState<Status>(token ? "verifying" : "invalid");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) return;
        let alive = true;
        verifyResetToken(token)
            .then((info) => {
                if (!alive) return;
                setStatus(info.valid ? "ready" : "invalid");
            })
            .catch(() => {
                if (alive) setStatus("invalid");
            });
        return () => {
            alive = false;
        };
    }, [token]);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!newPassword || !confirmPassword) {
            setError(t("auth.resetPasswordErrorRequired"));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t("auth.resetPasswordErrorMismatch"));
            return;
        }
        if (!STRONG_PASSWORD.test(newPassword)) {
            setError(t("auth.resetPasswordErrorWeak"));
            return;
        }

        setSubmitting(true);
        try {
            await resetPassword({ token, newPassword });
            setStatus("done");
        } catch (e) {
            setError(e instanceof AccountApiError ? e.message : t("auth.resetPasswordErrorWeak"));
        } finally {
            setSubmitting(false);
        }
    };

    if (status === "verifying") {
        return (
            <AuthShell
                title={t("auth.resetPasswordTitle")}
                subtitle={t("auth.resetPasswordVerifying")}
                footer={
                    <span>
                        <Link href="/login">{t("auth.backToLogin")}</Link>
                    </span>
                }
            >
                <p className={form.checkboxRow}>{t("auth.resetPasswordVerifying")}</p>
            </AuthShell>
        );
    }

    if (status === "invalid") {
        return (
            <AuthShell
                title={t("auth.resetPasswordInvalidTitle")}
                subtitle={t("auth.resetPasswordInvalidBody")}
                footer={
                    <span>
                        <Link href="/login">{t("auth.backToLogin")}</Link>
                    </span>
                }
            >
                <Link href="/forgot-password" className={controls.button} style={{ textDecoration: "none" }}>
                    {t("auth.resetPasswordRequestAgain")}
                </Link>
            </AuthShell>
        );
    }

    if (status === "done") {
        return (
            <AuthShell
                title={t("auth.resetPasswordSuccessTitle")}
                subtitle={t("auth.resetPasswordSuccessBody")}
                footer={<span />}
            >
                <Link href="/login" className={controls.button} style={{ textDecoration: "none" }}>
                    {t("auth.backToLogin")}
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={t("auth.resetPasswordTitle")}
            subtitle={t("auth.resetPasswordSubtitle")}
            footer={
                <span>
                    <Link href="/login">{t("auth.backToLogin")}</Link>
                </span>
            }
        >
            <form className={form.form} onSubmit={handleSubmit}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="newPassword">
                        {t("auth.resetPasswordNewLabel")}
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        className={controls.input}
                        placeholder={t("auth.resetPasswordNewPlaceholder")}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        autoFocus
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
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>

                {error && <p className={controls.error}>{error}</p>}

                <button type="submit" className={controls.button} disabled={submitting}>
                    {submitting ? t("auth.submitting") : t("auth.resetPasswordSubmit")}
                </button>
            </form>
        </AuthShell>
    );
}
