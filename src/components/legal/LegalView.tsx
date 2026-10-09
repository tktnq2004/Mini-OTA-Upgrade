"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import SiteFooter from "@/components/SiteFooter/SiteFooter";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { LEGAL_DOCS, LEGAL_UPDATED_AT, type LegalDocKey } from "@/data/legal";
import { formatDateVn } from "@/lib/format";
import styles from "./LegalView.module.css";

// Bố cục chung cho trang Điều khoản / Quyền riêng tư: mục lục bên trái (desktop), nội dung bên phải.
export default function LegalView({ doc }: { doc: LegalDocKey }) {
    const { t, language } = useLanguage();
    const content = LEGAL_DOCS[doc][language];
    const other: LegalDocKey = doc === "terms" ? "privacy" : "terms";

    return (
        <div className={styles.page}>
            <SiteHeader />
            <main className={styles.main}>
                <header className={styles.head}>
                    <span className={styles.updated}>
                        {t("legal.updated", { date: formatDateVn(LEGAL_UPDATED_AT, language) })}
                    </span>
                    <h1>{content.title}</h1>
                    <p>{content.intro}</p>
                </header>

                <div className={styles.layout}>
                    <nav className={styles.toc} aria-label={t("legal.toc")}>
                        <span className={styles.tocTitle}>{t("legal.toc")}</span>
                        {content.sections.map((section, i) => (
                            <a key={section.heading} href={`#s${i + 1}`}>
                                {section.heading}
                            </a>
                        ))}
                        <Link href={`/${other}`} className={styles.otherDoc}>
                            {LEGAL_DOCS[other][language].title} →
                        </Link>
                    </nav>

                    <article className={styles.body}>
                        {content.sections.map((section, i) => (
                            <section key={section.heading} id={`s${i + 1}`} className={styles.section}>
                                <h2>{section.heading}</h2>
                                {section.paragraphs.map((paragraph) => (
                                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                                ))}
                            </section>
                        ))}
                    </article>
                </div>
            </main>
            <SiteFooter destinations={[]} />
        </div>
    );
}
