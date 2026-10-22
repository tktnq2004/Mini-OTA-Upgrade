"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import styles from "./not-found.module.css";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { t } = useLanguage();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={styles.page}>
            <SiteHeader />
            <div className={styles.content}>
                <span className={styles.icon}>
                    <WarningCircleIcon size={20} weight="light" />
                </span>
                <h1>{t("errorPage.title")}</h1>
                <p>{t("errorPage.description")}</p>
                <div className={styles.actions}>
                    <button type="button" className={controls.button} onClick={reset}>
                        <ArrowClockwiseIcon size={15} weight="bold" />
                        {t("loadError.retry")}
                    </button>
                    <Link href="/" className={controls.buttonGhost}>
                        {t("notFound.backHome")}
                    </Link>
                </div>
                {error.digest && <span className={styles.code}>{t("errorPage.code", { code: error.digest })}</span>}
            </div>
        </div>
    );
}
