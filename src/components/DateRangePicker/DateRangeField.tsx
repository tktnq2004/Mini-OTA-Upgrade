"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarBlankIcon, MoonIcon } from "@phosphor-icons/react";
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
    maxDate?: string;
    // true: lịch luôn hiện ngay dưới 2 ô ngày (không popover, không tự đóng) —
    // dùng ở nơi còn trống chỗ như thẻ đặt phòng / trang checkout.
    alwaysOpen?: boolean;
    monthsToShow?: number;
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
    maxDate,
    alwaysOpen = false,
    monthsToShow = 1,
}: DateRangeFieldProps) {
    const { t, language } = useLanguage();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const open = alwaysOpen || popoverOpen;
    const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
        if (!alwaysOpen) setPopoverOpen(v);
    };
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!popoverOpen) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPopoverOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPopoverOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [popoverOpen]);

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
                <div className={alwaysOpen ? styles.inline : styles.popover}>
                    {!alwaysOpen && <p className={styles.popoverHint}>{t("checkout.datesHint")}</p>}
                    <DateRangePicker
                        checkIn={checkIn}
                        checkOut={checkOut}
                        onChange={handleChange}
                        disabledDates={disabledDates}
                        loading={loading}
                        minDate={minDate}
                        maxDate={maxDate}
                        monthsToShow={monthsToShow}
                    />
                    {alwaysOpen && (
                        <div className={styles.footer}>
                            {nights > 0 ? (
                                <span className={styles.footerNights}>
                                    <MoonIcon size={14} weight="fill" />
                                    {t("hotel.nightsSuffix", { count: nights })}
                                </span>
                            ) : (
                                <span className={styles.footerHint}>
                                    {t(checkIn ? "checkout.pickCheckoutHint" : "checkout.pickCheckinHint")}
                                </span>
                            )}
                            {checkIn && (
                                <button type="button" className={styles.footerClear} onClick={() => onChange(null, null)}>
                                    {t("checkout.clearDates")}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
