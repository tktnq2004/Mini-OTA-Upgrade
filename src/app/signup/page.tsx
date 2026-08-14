"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { FacebookLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import AuthShell from "@/components/auth/AuthShell";
import { useSocialAuth } from "@/components/auth/useSocialAuth";
import controls from "@/styles/controls.module.css";
import form from "@/components/auth/AuthForm.module.css";

export default function SignupPage() {
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
            setError("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        if (password.length < 6) {
            setError("Mật khẩu cần tối thiểu 6 ký tự");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        if (!agreed) {
            setError("Bạn cần đồng ý với điều khoản dịch vụ để tiếp tục");
            return;
        }

        console.log("Sign up with:", { fullName, email, phone, password });
    };

    return (
        <AuthShell
            title="Tạo tài khoản"
            subtitle="Đăng ký để lưu chuyến đi, nhận ưu đãi và đặt phòng nhanh hơn"
            footer={
                <span>
                    Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
                </span>
            }
        >
            <form className={form.form} onSubmit={handleSubmit}>
                <div className={controls.field}>
                    <label className={controls.label} htmlFor="fullName">
                        Họ và tên
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        className={controls.input}
                        placeholder="Nguyễn Văn A"
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
                        Số điện thoại <span>(tuỳ chọn)</span>
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
                        Mật khẩu
                    </label>
                    <input
                        id="signupPassword"
                        type="password"
                        className={controls.input}
                        placeholder="Tối thiểu 6 ký tự"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className={controls.field}>
                    <label className={controls.label} htmlFor="confirmPassword">
                        Xác nhận mật khẩu
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
                        Tôi đồng ý với <strong>Điều khoản dịch vụ</strong> và{" "}
                        <strong>Chính sách bảo mật</strong> của WenGo
                    </span>
                </label>

                {error && <p className={controls.error}>{error}</p>}

                <button type="submit" className={controls.button}>
                    Đăng ký
                </button>
            </form>

            <div className={form.divider}>
                <span>hoặc</span>
            </div>

            <div className={form.socialRow}>
                <button type="button" className={form.socialButton} onClick={loginFacebook}>
                    <FacebookLogoIcon size={18} weight="fill" />
                    Đăng ký với Facebook
                </button>
                <button type="button" className={form.socialButton} onClick={loginGoogle}>
                    <GoogleLogoIcon size={18} weight="bold" />
                    Đăng ký với Google
                </button>
            </div>
        </AuthShell>
    );
}
