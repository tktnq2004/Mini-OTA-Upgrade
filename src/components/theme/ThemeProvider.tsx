"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "MiniOTA-theme";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Script chạy trước khi React hydrate — đọc lựa chọn đã lưu và set thuộc
// tính data-theme ngay lập tức, tránh nháy sáng rồi mới chuyển tối (FOUC).
export const themeInitScript = `
try {
  var theme = localStorage.getItem("${STORAGE_KEY}");
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
} catch (e) {}
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        // Đồng bộ với localStorage (hệ thống ngoài React) — không đọc được
        // trong lúc render vì localStorage không tồn tại khi SSR.
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTheme(stored);
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) => (current === "light" ? "dark" : "light"));
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return ctx;
}
