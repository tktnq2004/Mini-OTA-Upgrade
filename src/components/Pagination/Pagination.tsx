"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./Pagination.module.css";

interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}

function getPageList(current: number, total: number): (number | "...")[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push("...");
    pages.push(total);

    return pages;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
    const { t } = useLanguage();
    if (totalPages <= 1) return null;

    const pageList = getPageList(page, totalPages);

    return (
        <nav className={styles.pagination} aria-label={t("pagination.nav")}>
            <button
                type="button"
                className={styles.arrow}
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                aria-label={t("pagination.prev")}
            >
                <CaretLeftIcon size={16} weight="bold" />
            </button>

            {pageList.map((item, index) =>
                item === "..." ? (
                    <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                        …
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        className={`${styles.page} ${item === page ? styles.pageActive : ""}`}
                        onClick={() => onChange(item)}
                        aria-current={item === page ? "page" : undefined}
                    >
                        {item}
                    </button>
                )
            )}

            <button
                type="button"
                className={styles.arrow}
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                aria-label={t("pagination.next")}
            >
                <CaretRightIcon size={16} weight="bold" />
            </button>
        </nav>
    );
}
