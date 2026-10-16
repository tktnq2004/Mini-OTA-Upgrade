"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./BrandLogo.module.css";

interface BrandLogoProps {
    className?: string;
}

// Chữ thương hiệu (Nunito Black, "OTA" màu nhấn) — cỡ chữ lấy theo phần tử cha.
// Tiếng Việt: "TrạmOTA"; tiếng Anh: "OTA Station".
export default function BrandLogo({ className }: BrandLogoProps) {
    const { language } = useLanguage();
    return (
        <span className={className ? `${styles.logo} ${className}` : styles.logo}>
            {language === "en" ? (
                <>
                    <span className={styles.accent}>OTA</span> Station
                </>
            ) : (
                <>
                    Trạm<span className={styles.accent}>OTA</span>
                </>
            )}
        </span>
    );
}
