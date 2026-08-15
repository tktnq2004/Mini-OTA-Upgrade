"use client";

import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import styles from "./not-found.module.css";

export default function NotFound() {
    const { t } = useLanguage();

    return (
        <div className={styles.page}>
            <SiteHeader />
            <div className={styles.content}>
                <span className={styles.icon}>
                    <CompassIcon size={20} weight="light" />
                </span>
                <h1>{t("notFound.title")}</h1>
                <p>{t("notFound.description")}</p>
                <Link href="/" className={controls.button}>
                    {t("notFound.backHome")}
                </Link>
            </div>
        </div>
    );
}
