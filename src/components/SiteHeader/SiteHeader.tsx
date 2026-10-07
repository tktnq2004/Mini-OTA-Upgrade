"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    CompassIcon,
    SunIcon,
    MoonIcon,
    HeartIcon,
    UserCircleIcon,
    CaretDownIcon,
    UserIcon,
    SuitcaseRollingIcon,
    CreditCardIcon,
} from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useAccount } from "@/components/auth/AccountProvider";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();
    const { count: wishlistCount } = useWishlist();
    const { user, ready, logout } = useAccount();
    const router = useRouter();

    // Menu tài khoản: bấm ra ngoài hoặc Esc thì đóng.
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);

    const handleLogout = async () => {
        await logout();
        router.push("/");
        router.refresh();
    };

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
                        href="/wishlist"
                        className={styles.cartButton}
                        aria-label={t("nav.wishlistAria", { count: wishlistCount })}
                    >
                        <HeartIcon size={16} weight="bold" />
                        {wishlistCount > 0 && <span className={styles.cartBadge}>{wishlistCount}</span>}
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

                    {ready && user ? (
                        <>
                            <div className={styles.accountMenu} ref={menuRef}>
                                <button
                                    type="button"
                                    className={styles.ghostButton}
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    onClick={() => setMenuOpen((o) => !o)}
                                >
                                    <UserCircleIcon size={16} weight="bold" />
                                    {user.name}
                                    <CaretDownIcon
                                        size={11}
                                        weight="bold"
                                        className={`${styles.caret} ${menuOpen ? styles.caretOpen : ""}`}
                                    />
                                </button>
                                {menuOpen && (
                                    <div className={styles.dropdown} role="menu">
                                        <Link
                                            href="/account"
                                            role="menuitem"
                                            className={styles.dropdownItem}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <UserIcon size={15} />
                                            {t("nav.profile")}
                                        </Link>
                                        <Link
                                            href="/account/bookings"
                                            role="menuitem"
                                            className={styles.dropdownItem}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <SuitcaseRollingIcon size={15} />
                                            {t("nav.myBookings")}
                                        </Link>
                                        <Link
                                            href="/account/payment-methods"
                                            role="menuitem"
                                            className={styles.dropdownItem}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <CreditCardIcon size={15} />
                                            {t("nav.paymentMethods")}
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <button type="button" className={styles.solidButton} onClick={handleLogout}>
                                {t("nav.logout")}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className={styles.ghostButton}>
                                {t("nav.login")}
                            </Link>
                            <Link href="/signup" className={styles.solidButton}>
                                {t("nav.signup")}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
