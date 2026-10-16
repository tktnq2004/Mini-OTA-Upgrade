"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "@/components/admin/adminPage.module.css";

const SECTIONS = [
    { href: "/admin/hotels", titleKey: "admin.nav.hotels", descKey: "admin.overview.hotelsDesc" },
    { href: "/admin/users", titleKey: "admin.nav.users", descKey: "admin.overview.usersDesc" },
    { href: "/admin/roles", titleKey: "admin.nav.roles", descKey: "admin.overview.rolesDesc" },
    { href: "/admin/roomtypes", titleKey: "admin.nav.roomTypes", descKey: "admin.overview.roomTypesDesc" },
    { href: "/admin/amenities", titleKey: "admin.nav.amenities", descKey: "admin.overview.amenitiesDesc" },
    { href: "/admin/views", titleKey: "admin.nav.views", descKey: "admin.overview.viewsDesc" },
    { href: "/admin/discounts", titleKey: "admin.nav.discounts", descKey: "admin.overview.discountsDesc" },
];

export default function AdminHomePage() {
    const { t } = useLanguage();

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>{t("admin.nav.overview")}</h1>
                    <p className={styles.pageSubtitle}>{t("admin.overview.subtitle")}</p>
                </div>
            </div>

            <div className={styles.formGrid}>
                {SECTIONS.map((s) => (
                    <Link key={s.href} href={s.href} className={styles.card} style={{ textDecoration: "none" }}>
                        <h2 className={styles.cardTitle}>{t(s.titleKey)}</h2>
                        <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-text-muted)" }}>{t(s.descKey)}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
