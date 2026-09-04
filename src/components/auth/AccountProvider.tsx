"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadCartFromStorage, mergeCartOnLogin } from "@/components/cart/cartStorage";
import type { LoginInput, RegisterInput, SessionUser } from "@/lib/auth/types";

interface AuthResult {
    ok: boolean;
    message?: string;
}

interface AccountContextValue {
    user: SessionUser | null;
    ready: boolean; // đã hỏi xong /api/account/session lần đầu chưa
    login: (input: LoginInput) => Promise<AuthResult>;
    register: (input: RegisterInput) => Promise<AuthResult>;
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
        // ThemeProvider/CartProvider tự hydrate từ 1 nguồn ngoài React.
        fetch("/api/account/session")
            .then((res) => res.json())
            .then((data) => setUser(data?.user ?? null))
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
        await mergeCartOnLogin(loadCartFromStorage());
        return { ok: true };
    };

    const register = async (input: RegisterInput): Promise<AuthResult> => {
        const res = await fetch("/api/account/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, message: data?.message ?? "Đăng ký thất bại" };
        if (data.autoLoginFailed) {
            // Cực hiếm (tạo tài khoản OK nhưng auto-login lỗi) — coi như thành
            // công vẫn phải bắt đăng nhập tay, không có session để set user.
            return { ok: true };
        }
        setUser(data.user ?? null);
        await mergeCartOnLogin(loadCartFromStorage());
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
        <AccountContext.Provider value={{ user, ready, login, register, logout, patchUser }}>
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
