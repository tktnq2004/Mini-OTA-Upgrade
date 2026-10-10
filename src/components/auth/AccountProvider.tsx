"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AccountApiError } from "@/lib/auth/apiClient";
import type { CompleteRegisterInput, LoginInput, SessionUser } from "@/lib/auth/types";
import { sendLoginOtp as apiSendLoginOtp, sendRegisterOtp as apiSendRegisterOtp } from "@/lib/auth/resources";

interface AuthResult {
    ok: boolean;
    message?: string;
}

// Kết quả gửi OTP — retryAfter (giây) chỉ có khi bấm gửi lại quá sớm (429),
// SignupPage dùng để hiện ngay thời gian chờ còn lại thay vì thông báo lỗi
// chung chung.
interface SendOtpResult {
    ok: boolean;
    message?: string;
    retryAfter?: number;
}

interface AccountContextValue {
    user: SessionUser | null;
    ready: boolean; // đã hỏi xong /api/account/session lần đầu chưa
    login: (input: LoginInput) => Promise<AuthResult>;
    // Đăng ký giờ gồm 2 bước: sendRegisterOtp (gửi mã) rồi register (kèm mã,
    // tạo tài khoản thật + đăng nhập luôn) — xem SignupPage.
    sendRegisterOtp: (email: string) => Promise<SendOtpResult>;
    register: (input: CompleteRegisterInput) => Promise<AuthResult>;
    // Đăng nhập không cần mật khẩu, cũng 2 bước — xem LoginForm.
    sendLoginOtp: (email: string) => Promise<SendOtpResult>;
    loginWithOtp: (email: string, otp: string) => Promise<AuthResult>;
    logout: () => Promise<void>;
    patchUser: (patch: Partial<SessionUser>) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Access token là cookie httpOnly (JS không đọc được) — phải hỏi
        // ngược server đang đăng nhập là ai qua route riêng, giống cách
        // ThemeProvider/WishlistProvider tự hydrate từ 1 nguồn ngoài React.
        // Chưa đăng nhập thì thử nhận phiên Google login (backend để lại
        // cookie refresh-token-Mini rồi redirect về đây) — xem
        // app/api/v1/account/oauth-session/route.ts.
        const loadUser = async (): Promise<SessionUser | null> => {
            const data = await fetch("/api/account/session").then((res) => res.json());
            if (data?.user) return data.user;
            const oauth = await fetch("/api/v1/account/oauth-session", { method: "POST" }).then((res) =>
                res.json()
            );
            return oauth?.user ?? null;
        };
        loadUser()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setReady(true));
    }, []);

    const login = async ({ email, password }: LoginInput): Promise<AuthResult> => {
        const res = await fetch("/api/account/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, message: data?.message ?? "Đăng nhập thất bại" };
        setUser(data.user ?? null);
        return { ok: true };
    };

    // Bước 1: gửi OTP về email — chưa tạo tài khoản, chỉ sau khi nhập đúng mã
    // ở register() dưới thì tài khoản mới thật sự được tạo.
    const requestRegisterOtp = async (email: string): Promise<SendOtpResult> => {
        try {
            await apiSendRegisterOtp(email);
            return { ok: true };
        } catch (e) {
            if (e instanceof AccountApiError) {
                return { ok: false, message: e.message, retryAfter: e.retryAfter };
            }
            return { ok: false, message: "Gửi mã thất bại, vui lòng thử lại" };
        }
    };

    // Bước 2: kèm mã OTP — backend tự kiểm tra, tạo tài khoản VÀ đăng nhập
    // luôn trong 1 lần gọi (xem app/api/account/auth/register/route.ts).
    const register = async (input: CompleteRegisterInput): Promise<AuthResult> => {
        const res = await fetch("/api/account/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, message: data?.message ?? "Đăng ký thất bại" };
        setUser(data.user ?? null);
        return { ok: true };
    };

    // Bước 1: gửi OTP đăng nhập — cố tình trả cùng kết quả cho mọi email (xem
    // sendLoginOtp ở resources.ts), lỗi "không có tài khoản" chỉ lộ ra ở bước 2.
    const requestLoginOtp = async (email: string): Promise<SendOtpResult> => {
        try {
            await apiSendLoginOtp(email);
            return { ok: true };
        } catch (e) {
            if (e instanceof AccountApiError) {
                return { ok: false, message: e.message, retryAfter: e.retryAfter };
            }
            return { ok: false, message: "Gửi mã thất bại, vui lòng thử lại" };
        }
    };

    // Bước 2: kèm mã OTP, đăng nhập thẳng không cần mật khẩu.
    const loginWithOtp = async (email: string, otp: string): Promise<AuthResult> => {
        const res = await fetch("/api/account/auth/login-mail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, message: data?.message ?? "Đăng nhập thất bại" };
        setUser(data.user ?? null);
        return { ok: true };
    };

    const logout = async () => {
        await fetch("/api/account/auth/logout", { method: "POST" }).catch(() => null);
        setUser(null);
    };

    const patchUser = (patch: Partial<SessionUser>) => {
        setUser((current) => (current ? { ...current, ...patch } : current));
    };

    return (
        <AccountContext.Provider
            value={{
                user,
                ready,
                login,
                sendRegisterOtp: requestRegisterOtp,
                register,
                sendLoginOtp: requestLoginOtp,
                loginWithOtp,
                logout,
                patchUser,
            }}
        >
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    const ctx = useContext(AccountContext);
    if (!ctx) {
        throw new Error("useAccount must be used within an AccountProvider");
    }
    return ctx;
}
