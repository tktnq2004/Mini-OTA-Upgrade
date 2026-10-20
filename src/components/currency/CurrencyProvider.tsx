"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatCompactUsd, formatCompactVnd, formatUsd, formatVnd, vndToUsd } from "@/lib/format";

// Tiền tệ HIỂN THỊ (nút ₫/$ ở header). Mọi giá trong hệ thống vẫn là VND —
// backend tính, Stripe/SePay thu bằng VND — USD chỉ là quy đổi để khách dễ
// hình dung (tỉ giá cố định, xem VND_PER_USD ở lib/format). Chỗ cần đúng số
// VND thật (nội dung/số tiền chuyển khoản SePay, trang admin) vẫn gọi thẳng
// formatVnd, không qua đây.
export type Currency = "VND" | "USD";

const STORAGE_KEY = "MiniOTA-currency";

interface CurrencyContextValue {
    currency: Currency;
    toggleCurrency: () => void;
    // Nhận số tiền VND, trả chuỗi theo tiền tệ đang chọn.
    formatPrice: (vnd: number) => string;
    formatCompactPrice: (vnd: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrency] = useState<Currency>("VND");

    useEffect(() => {
        // localStorage không có lúc SSR -> đọc sau khi mount (giống LanguageProvider).
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ từ localStorage, hệ thống ngoài React
            if (stored === "VND" || stored === "USD") setCurrency(stored);
        } catch {
            // Storage bị chặn -> giữ mặc định VND.
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, currency);
        } catch {
            // bỏ qua
        }
    }, [currency]);

    const toggleCurrency = useCallback(() => setCurrency((c) => (c === "VND" ? "USD" : "VND")), []);
    const formatPrice = useCallback(
        (vnd: number) => (currency === "USD" ? formatUsd(vndToUsd(vnd)) : formatVnd(vnd)),
        [currency],
    );
    const formatCompactPrice = useCallback(
        (vnd: number) => (currency === "USD" ? formatCompactUsd(vndToUsd(vnd)) : formatCompactVnd(vnd)),
        [currency],
    );

    const value = useMemo(
        () => ({ currency, toggleCurrency, formatPrice, formatCompactPrice }),
        [currency, toggleCurrency, formatPrice, formatCompactPrice],
    );

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return ctx;
}
