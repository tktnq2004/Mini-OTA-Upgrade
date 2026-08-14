"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { FacebookLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import AuthShell from "@/components/auth/AuthShell";
import { useSocialAuth } from "@/components/auth/useSocialAuth";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { loginFacebook, loginGoogle } = useSocialAuth();

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Vui lòng nhập đầy đủ email và mật khẩu");
            return;
        }

        console.log("Login with email:", { email, password });
    };

    return (
        <AuthShell
            title="Đăng nhập"
            subtitle="Tiếp tục để khám phá phòng ở dạng toàn cảnh 360°"
            footer={
                <span>
                    Chưa có tài khoản? <Link href="/signup">Đăng ký</Link>
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
                        Mật khẩu
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
                    Đăng nhập
                </button>
            </form>

            <div className={form.divider}>
                <span>hoặc</span>
            </div>

            <div className={form.socialRow}>
                <button type="button" className={form.socialButton} onClick={loginFacebook}>
                    <FacebookLogoIcon size={18} weight="fill" />
                    Đăng nhập với Facebook
                </button>
                <button type="button" className={form.socialButton} onClick={loginGoogle}>
                    <GoogleLogoIcon size={18} weight="bold" />
                    Đăng nhập với Google
                </button>
            </div>
        </AuthShell>
    );
}
