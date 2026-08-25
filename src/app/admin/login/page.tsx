"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import controls from "@/styles/controls.module.css";
import styles from "./login.module.css";

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Vui lòng nhập email và mật khẩu");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.message || "Đăng nhập thất bại");
                return;
            }
            router.push("/admin");
            router.refresh();
        } catch {
            setError("Không thể kết nối tới máy chủ");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Admin — Mini-OTA</h1>
                <p className={styles.subtitle}>Đăng nhập bằng tài khoản có quyền ADMIN</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={controls.field}>
                        <label className={controls.label} htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className={controls.input}
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="username"
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
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <p className={controls.error}>{error}</p>}

                    <button type="submit" className={controls.button} disabled={submitting}>
                        {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>
            </div>
        </div>
    );
}
