"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SocialAuthLinks from "@/components/auth/SocialAuthLinks";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

export default function LoginForm() {
    const { t } = useLanguage();
    const { login } = useAccount();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(searchParams.get("social_error") ? t("auth.socialLoginError") : "");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
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

                <button type="submit" className={controls.button} disabled={submitting}>
                    {submitting ? t("auth.submitting") : t("nav.login")}
                </button>
            </form>

            <div className={form.divider}>
                <span>{t("auth.or")}</span>
            </div>

            <SocialAuthLinks />
        </AuthShell>
    );
}
