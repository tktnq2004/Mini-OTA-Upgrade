"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CompassIcon, CheckIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./AuthShell.module.css";

interface AuthShellProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
    const { t } = useLanguage();
    const perks = [t("auth.perk1"), t("auth.perk2"), t("auth.perk3")];

    return (
        <div className={styles.page}>
            <div className={styles.formSide}>
                <div className={styles.formInner}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.mark}>
                            <CompassIcon size={13} weight="bold" />
                        </span>
                        Wen<span className={styles.logoAccent}>Go</span>
                    </Link>

                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.subtitle}>{subtitle}</p>

                    {children}

                    <div className={styles.footer}>{footer}</div>

                    <Link className={styles.skipLink} href="/map">
                        {t("auth.skipLink")}
                    </Link>
                </div>
            </div>

            <div className={styles.visualSide}>
                <div className={styles.visualContent}>
                    <blockquote className={styles.quote}>{t("auth.quote")}</blockquote>
                    <ul className={styles.perks}>
                        {perks.map((perk) => (
                            <li key={perk}>
                                <CheckIcon size={14} weight="bold" />
                                {perk}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
