"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateVn, nightsBetween } from "@/lib/searchFilters";
import DateRangePicker from "./DateRangePicker";
import styles from "./DateRangeField.module.css";

interface DateRangeFieldProps {
    checkIn: string | null;
    checkOut: string | null;
    onChange: (checkIn: string | null, checkOut: string | null) => void;
    disabledDates?: string[];
    loading?: boolean;
    minDate?: string;
}

// Ô "Nhận phòng / Trả phòng" gọn — bấm vào mới mở lịch (popover) để không
// chiếm chỗ trong danh sách/tóm tắt. Lịch thật nằm ở DateRangePicker.
export default function DateRangeField({
    checkIn,
    checkOut,
    onChange,
    disabledDates,
    loading,
    minDate,
}: DateRangeFieldProps) {
    const { t, language } = useLanguage();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const handleChange = (ci: string | null, co: string | null) => {
        onChange(ci, co);
        // Chọn xong đủ khoảng thì tự đóng lịch.
        if (ci && co) setOpen(false);
    };

    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

    return (
        <div className={styles.wrap} ref={wrapRef}>
            <div className={`${styles.fields} ${open ? styles.fieldsOpen : ""}`}>
                <button
                    type="button"
                    className={styles.field}
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                >
                    <span className={styles.label}>
                        <CalendarBlankIcon size={12} weight="bold" /> {t("search.checkinLabel")}
                    </span>
                    <span className={checkIn ? styles.value : styles.placeholder}>
                        {checkIn ? formatDateVn(checkIn, language) : t("checkout.pickDate")}
                    </span>
                </button>

                <span className={styles.sep} aria-hidden>
                    →
                </span>

                <button
                    type="button"
                    className={styles.field}
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                >
                    <span className={styles.label}>
                        <CalendarBlankIcon size={12} weight="bold" /> {t("search.checkoutLabel")}
                    </span>
                    <span className={checkOut ? styles.value : styles.placeholder}>
                        {checkOut ? formatDateVn(checkOut, language) : t("checkout.pickDate")}
                    </span>
                </button>
            </div>

            {nights > 0 && !open && (
                <p className={styles.nights}>{t("hotel.nightsSuffix", { count: nights })}</p>
            )}

            {open && (
                <div className={styles.popover}>
                    <p className={styles.popoverHint}>{t("checkout.datesHint")}</p>
                    <DateRangePicker
                        checkIn={checkIn}
                        checkOut={checkOut}
                        onChange={handleChange}
                        disabledDates={disabledDates}
                        loading={loading}
                        minDate={minDate}
                        monthsToShow={1}
                    />
                </div>
            )}
        </div>
    );
}
