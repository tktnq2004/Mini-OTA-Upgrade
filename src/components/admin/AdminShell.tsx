"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import BrandLogo from "@/components/BrandLogo/BrandLogo";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useAdminAccess } from "./AdminAccessProvider";
import styles from "./AdminShell.module.css";

const NAV_ITEMS = [
    { href: "/admin", labelKey: "admin.nav.overview", module: undefined },
    { href: "/admin/users", labelKey: "admin.nav.users", module: "USER" },
    { href: "/admin/roles", labelKey: "admin.nav.roles", module: "ROLE" },
    { href: "/admin/hotels", labelKey: "admin.nav.hotels", module: "HOTEL" },
    { href: "/admin/roomtypes", labelKey: "admin.nav.roomTypes", module: "ROOM_TYPE" },
    { href: "/admin/amenities", labelKey: "admin.nav.amenities", module: "AMENITY" },
    { href: "/admin/views", labelKey: "admin.nav.views", module: "VIEW" },
    { href: "/admin/discounts", labelKey: "admin.nav.discounts", module: "DISCOUNT" },
] satisfies { href: string; labelKey: string; module: string | undefined }[];

interface AdminShellProps {
    user: { name: string; email: string };
    children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { hasModule } = useAdminAccess();
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage, t } = useLanguage();

    const handleLogout = async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    };

    const visibleNavItems = NAV_ITEMS.filter((item) => !item.module || hasModule(item.module));

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <BrandLogo /> Admin
                </div>
                <nav className={styles.nav}>
                    {visibleNavItems.map((item) => {
                        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} className={active ? styles.navLinkActive : styles.navLink}>
                                {t(item.labelKey)}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <div className={styles.main}>
                <header className={styles.topbar}>
                    <span className={styles.topbarUser}>
                        {t("admin.signedInAs")} <strong>{user.name || user.email}</strong>
                    </span>
                    <div className={styles.topbarActions}>
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
                            {theme === "light" ? <MoonIcon size={15} weight="bold" /> : <SunIcon size={15} weight="bold" />}
                        </button>
                        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                            {t("nav.logout")}
                        </button>
                    </div>
                </header>
                <main className={styles.content}>{children}</main>
            </div>
        </div>
    );
}
