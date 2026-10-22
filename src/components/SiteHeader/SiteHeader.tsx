"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    SunIcon,
    MoonIcon,
    HeartIcon,
    UserCircleIcon,
    CaretDownIcon,
    UserIcon,
    SuitcaseRollingIcon,
    CreditCardIcon,
    ListIcon,
    XIcon,
    MapTrifoldIcon,
    BuildingsIcon,
} from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useAccount } from "@/components/auth/AccountProvider";
import BrandLogo from "@/components/BrandLogo/BrandLogo";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();
    const { count: wishlistCount } = useWishlist();
    const { user, ready, isGuest, logout } = useAccount();
    const router = useRouter();
    const pathname = usePathname();

    // Menu thu gọn cho màn hẹp (≤ 720px): gom điều hướng, tài khoản, ngôn ngữ, giao diện —
    // thay cho hàng nút đầy đủ vốn tràn ngang trên điện thoại.
    const [mobileOpen, setMobileOpen] = useState(false);
    // Đổi trang thì đóng menu (so sánh ngay khi render, không cần effect).
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setMobileOpen(false);
    }
    useEffect(() => {
        if (!mobileOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMobileOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [mobileOpen]);

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
        setMobileOpen(false);
        await logout();
        router.push("/");
        router.refresh();
    };

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo} aria-label={language === "en" ? "OTA Station" : "Trạm OTA"}>
                    <BrandLogo />
                </Link>

                <nav className={styles.nav}>
                    <Link href="/map" className={styles.navLink}>
                        {t("nav.map")}
                    </Link>
                    <Link href="/hotels" className={styles.navLink}>
                        {t("nav.hotelsList")}
                    </Link>
                    {/* Khách vãng lai tra lịch sử đặt phòng bằng email + OTP (cùng trang /account/bookings). */}
                    {ready && !user && (
                        <Link href="/account/bookings" className={styles.navLink}>
                            {t("nav.findBooking")}
                        </Link>
                    )}
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
                        className={`${styles.iconButton} ${styles.desktopOnly}`}
                        onClick={toggleLanguage}
                        aria-label={t("nav.languageToggle")}
                    >
                        {language === "vi" ? "EN" : "VI"}
                    </button>

                    <button
                        type="button"
                        className={`${styles.iconButton} ${styles.desktopOnly}`}
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
                        <div className={`${styles.authGroup} ${styles.desktopOnly}`}>
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
                                        {/* Phiên GUEST chỉ có lịch sử đặt phòng — không hồ sơ/thẻ đã lưu. */}
                                        {!isGuest && (
                                            <Link
                                                href="/account"
                                                role="menuitem"
                                                className={styles.dropdownItem}
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                <UserIcon size={15} />
                                                {t("nav.profile")}
                                            </Link>
                                        )}
                                        <Link
                                            href="/account/bookings"
                                            role="menuitem"
                                            className={styles.dropdownItem}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            <SuitcaseRollingIcon size={15} />
                                            {t("nav.myBookings")}
                                        </Link>
                                        {!isGuest && (
                                            <Link
                                                href="/account/payment-methods"
                                                role="menuitem"
                                                className={styles.dropdownItem}
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                <CreditCardIcon size={15} />
                                                {t("nav.paymentMethods")}
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button type="button" className={styles.solidButton} onClick={handleLogout}>
                                {t("nav.logout")}
                            </button>
                        </div>
                    ) : (
                        <div className={`${styles.authGroup} ${styles.desktopOnly}`}>
                            <Link href="/login" className={styles.ghostButton}>
                                {t("nav.login")}
                            </Link>
                            <Link href="/signup" className={styles.solidButton}>
                                {t("nav.signup")}
                            </Link>
                        </div>
                    )}

                    <button
                        type="button"
                        className={`${styles.iconButton} ${styles.menuButton}`}
                        onClick={() => setMobileOpen((open) => !open)}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-menu"
                        aria-label={mobileOpen ? t("nav.menuClose") : t("nav.menuOpen")}
                    >
                        {mobileOpen ? <XIcon size={16} weight="bold" /> : <ListIcon size={16} weight="bold" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <>
                    <div className={styles.mobileBackdrop} onClick={() => setMobileOpen(false)} aria-hidden />
                    <nav id="mobile-menu" className={styles.mobilePanel} aria-label={t("nav.menuOpen")}>
                        <Link href="/map" className={styles.mobileLink}>
                            <MapTrifoldIcon size={18} />
                            {t("nav.map")}
                        </Link>
                        <Link href="/hotels" className={styles.mobileLink}>
                            <BuildingsIcon size={18} />
                            {t("nav.hotelsList")}
                        </Link>
                        <Link href="/wishlist" className={styles.mobileLink}>
                            <HeartIcon size={18} />
                            {t("nav.wishlist")}
                            {wishlistCount > 0 && <span className={styles.mobileCount}>{wishlistCount}</span>}
                        </Link>

                        {ready && !user && (
                            <Link href="/account/bookings" className={styles.mobileLink}>
                                <SuitcaseRollingIcon size={18} />
                                {t("nav.findBooking")}
                            </Link>
                        )}

                        {ready && user && (
                            <>
                                <span className={styles.mobileHeading}>{user.name}</span>
                                {!isGuest && (
                                    <Link href="/account" className={styles.mobileLink}>
                                        <UserIcon size={18} />
                                        {t("nav.profile")}
                                    </Link>
                                )}
                                <Link href="/account/bookings" className={styles.mobileLink}>
                                    <SuitcaseRollingIcon size={18} />
                                    {t("nav.myBookings")}
                                </Link>
                                {!isGuest && (
                                    <Link href="/account/payment-methods" className={styles.mobileLink}>
                                        <CreditCardIcon size={18} />
                                        {t("nav.paymentMethods")}
                                    </Link>
                                )}
                            </>
                        )}

                        <div className={styles.mobileToggles}>
                            <button type="button" className={styles.ghostButton} onClick={toggleLanguage}>
                                {language === "vi" ? "English" : "Tiếng Việt"}
                            </button>
                            <button type="button" className={styles.ghostButton} onClick={toggleTheme}>
                                {theme === "light" ? <MoonIcon size={15} weight="bold" /> : <SunIcon size={15} weight="bold" />}
                                {theme === "light" ? t("nav.themeDark") : t("nav.themeLight")}
                            </button>
                        </div>

                        <div className={styles.mobileAuth}>
                            {ready && user ? (
                                <button type="button" className={styles.ghostButton} onClick={handleLogout}>
                                    {t("nav.logout")}
                                </button>
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
                    </nav>
                </>
            )}
        </header>
    );
}
