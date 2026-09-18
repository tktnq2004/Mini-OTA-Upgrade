"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

export default function CompleteProfileForm() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId") ?? "";
    const email = searchParams.get("email") ?? "";
    const name = searchParams.get("name") ?? "";

    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!sessionId) {
            setError(t("auth.completeProfileErrorSession"));
            return;
        }
        if (!username || !phone) {
            setError(t("auth.completeProfileErrorRequired"));
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/account/auth/complete-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, username, phone }),
            });
            if (!res.ok) {
                setError(t("auth.completeProfileErrorFailed"));
                return;
            }
            router.push("/");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            title={t("auth.completeProfileTitle")}
            subtitle={name ? `${t("auth.completeProfileSubtitlePrefix")} ${name} (${email})` : email}
            footer={
                <span>
                    <Link href="/login">{t("nav.login")}</Link>
                </span>
            }
        >
            <form className={form.form} onSubmit={handleSubmit}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="username">
                        {t("auth.usernameLabel")}
                    </label>
                    <input
                        id="username"
                        type="text"
                        className={controls.input}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
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
                        placeholder="09xx xxx xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                {error && <p className={controls.error}>{error}</p>}

                <button type="submit" className={controls.button} disabled={submitting}>
                    {t("auth.completeProfileSubmit")}
                </button>
            </form>
        </AuthShell>
    );
}
