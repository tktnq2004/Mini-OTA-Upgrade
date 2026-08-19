"use client";

import Link from "next/link";
import { CompassIcon, SunIcon, MoonIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCart } from "@/components/cart/CartProvider";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();
    const { totalCount } = useCart();

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.mark}>
                        <CompassIcon size={14} weight="bold" />
                    </span>
                    Wen<span className={styles.logoAccent}>Go</span>
                </Link>

                <nav className={styles.nav}>
                    <Link href="/map" className={styles.navLink}>
                        {t("nav.map")}
                    </Link>
                    <Link href="/hotels" className={styles.navLink}>
                        {t("nav.hotelsList")}
                    </Link>
                </nav>

                <div className={styles.actions}>
                    <Link
                        href="/cart"
                        className={styles.cartButton}
                        aria-label={t("nav.cartAria", { count: totalCount })}
                    >
                        <ShoppingBagIcon size={16} weight="bold" />
                        {totalCount > 0 && <span className={styles.cartBadge}>{totalCount}</span>}
                    </Link>

                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={toggleLanguage}
                        aria-label={t("nav.languageToggle")}
                    >
                        {language === "vi" ? "EN" : "VI"}
                    </button>

                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={toggleTheme}
                        aria-label={theme === "light" ? t("nav.themeToDark") : t("nav.themeToLight")}
                    >
                        {theme === "light" ? (
                            <MoonIcon size={15} weight="bold" />
                        ) : (
                            <SunIcon size={15} weight="bold" />
                        )}
                    </button>

                    <Link href="/login" className={styles.ghostButton}>
                        {t("nav.login")}
                    </Link>
                    <Link href="/signup" className={styles.solidButton}>
                        {t("nav.signup")}
                    </Link>
                </div>
            </div>
        </header>
    );
}
