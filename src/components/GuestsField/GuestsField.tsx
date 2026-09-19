"use client";

import { useId } from "react";
import { UsersIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import controls from "@/styles/controls.module.css";
import styles from "./GuestsField.module.css";

interface GuestsFieldProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    // true: nhãn nằm trên ô số, ô số rộng hết cột (dùng trong form). Mặc định:
    // nhãn bên trái, ô số nhỏ bên phải trên 1 hàng (dùng trong thẻ hẹp).
    stacked?: boolean;
}

// Ô "Số khách" dùng chung cho trang chi tiết phòng và trang checkout.
export default function GuestsField({ value, onChange, max = 30, stacked = false }: GuestsFieldProps) {
    const { t } = useLanguage();
    const id = useId();

    return (
        <div className={stacked ? styles.stacked : styles.field}>
            <label className={controls.label} htmlFor={id}>
                <UsersIcon size={13} weight="bold" /> {t("checkout.guestsLabel")}
            </label>
            <input
                id={id}
                type="number"
                min={1}
                max={max}
                className={controls.input}
                value={value}
                onChange={(e) => onChange(Math.min(max, Math.max(1, Number(e.target.value) || 1)))}
            />
        </div>
    );
}
