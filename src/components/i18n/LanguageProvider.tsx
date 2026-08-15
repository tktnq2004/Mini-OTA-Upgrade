"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import vi from "./dictionaries/vi.json";
import en from "./dictionaries/en.json";

export type Language = "vi" | "en";

type Dictionary = Record<string, string>;

const DICTIONARIES: Record<Language, Dictionary> = { vi, en };

const STORAGE_KEY = "MiniOTA-language";

interface LanguageContextValue {
    language: Language;
    toggleLanguage: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function translate(language: Language, key: string, params?: Record<string, string | number>) {
    let value = DICTIONARIES[language][key] ?? key;
    if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
            value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        }
    }
    return value;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>("vi");

    useEffect(() => {
        // Đồng bộ với localStorage (hệ thống ngoài React) — không đọc được
        // trong lúc render vì localStorage không tồn tại khi SSR.
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "vi" || stored === "en") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLanguage(stored);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.setAttribute("lang", language);
    }, [language]);

    const toggleLanguage = () => {
        setLanguage((current) => (current === "vi" ? "en" : "vi"));
    };

    const t = (key: string, params?: Record<string, string | number>) =>
        translate(language, key, params);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return ctx;
}
