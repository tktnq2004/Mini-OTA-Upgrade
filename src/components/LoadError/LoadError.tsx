"use client";

import { ArrowClockwiseIcon, CloudSlashIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import styles from "./LoadError.module.css";

interface LoadErrorProps {
    onRetry: () => void;
    /** Ghi đè câu mô tả mặc định ("Không tải được dữ liệu…"). */
    message?: string;
    /** Bản gọn để đặt nổi trên bản đồ. */
    compact?: boolean;
}

// Khối báo lỗi tải dữ liệu dùng chung — phân biệt rõ với trạng thái "không có kết quả".
export default function LoadError({ onRetry, message, compact }: LoadErrorProps) {
    const { t } = useLanguage();

    return (
        <div className={`${styles.box} ${compact ? styles.compact : ""}`} role="alert">
            <span className={styles.icon}>
                <CloudSlashIcon size={22} weight="light" />
            </span>
            <div className={styles.text}>
                <strong>{t("loadError.title")}</strong>
                <p>{message ?? t("loadError.description")}</p>
            </div>
            <button type="button" className={controls.button} onClick={onRetry}>
                <ArrowClockwiseIcon size={15} weight="bold" />
                {t("loadError.retry")}
            </button>
        </div>
    );
}
