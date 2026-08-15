"use client";

import { useState } from "react";
import { MapPinIcon, CalendarBlankIcon, UsersIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { provinces, getWardsByProvince } from "@/data/locations.data";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
    addDaysIso,
    defaultFilters,
    todayIso,
    type SearchFilters,
} from "@/lib/searchFilters";
import Stepper from "./Stepper";
import styles from "./SearchWidget.module.css";

interface SearchWidgetProps {
    variant?: "hero" | "bar";
    initialFilters?: SearchFilters;
    onSubmit: (filters: SearchFilters) => void;
    submitLabel?: string;
}

export default function SearchWidget({
    variant = "hero",
    initialFilters,
    onSubmit,
    submitLabel,
}: SearchWidgetProps) {
    const { t } = useLanguage();
    const base = initialFilters ?? defaultFilters();
    const [provinceId, setProvinceId] = useState<number | null>(base.provinceId);
    const [wardId, setWardId] = useState<string | null>(base.wardId);
    const [checkin, setCheckin] = useState(base.checkin);
    const [checkout, setCheckout] = useState(base.checkout);
    const [guests, setGuests] = useState(base.guests);

    // Khi initialFilters đổi từ bên ngoài (vd. Map đồng bộ lại từ URL), nạp lại
    // state cục bộ ngay trong lúc render thay vì dùng effect — tránh một nhịp
    // render thừa và tránh cảnh báo set-state-in-effect.
    const initialSignature = initialFilters
        ? [
              initialFilters.provinceId,
              initialFilters.wardId,
              initialFilters.checkin,
              initialFilters.checkout,
              initialFilters.guests,
          ].join("|")
        : "";
    const [lastInitialSignature, setLastInitialSignature] = useState(initialSignature);

    if (initialFilters && initialSignature !== lastInitialSignature) {
        setLastInitialSignature(initialSignature);
        setProvinceId(initialFilters.provinceId);
        setWardId(initialFilters.wardId);
        setCheckin(initialFilters.checkin);
        setCheckout(initialFilters.checkout);
        setGuests(initialFilters.guests);
    }

    const wardOptions = getWardsByProvince(provinceId);
    const minCheckin = todayIso();
    const minCheckout = addDaysIso(checkin || minCheckin, 1);

    const handleProvinceChange = (value: string) => {
        const next = value ? Number(value) : null;
        setProvinceId(next);
        setWardId(null);
    };

    const handleCheckinChange = (value: string) => {
        setCheckin(value);
        if (checkout && checkout <= value) {
            setCheckout(addDaysIso(value, 1));
        }
    };

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit({ provinceId, wardId, checkin, checkout, guests });
    };

    return (
        <form
            className={`${styles.widget} ${variant === "bar" ? styles.bar : styles.hero}`}
            onSubmit={handleSubmit}
        >
            <div className={styles.field}>
                <label className={styles.label} htmlFor="sw-province">
                    <MapPinIcon size={14} weight="bold" /> {t("search.provinceLabel")}
                </label>
                <select
                    id="sw-province"
                    className={styles.selectControl}
                    value={provinceId ?? ""}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                >
                    <option value="">{t("search.provinceAllOption")}</option>
                    {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="sw-ward">
                    <MapPinIcon size={14} weight="bold" /> {t("search.wardLabel")}
                </label>
                <select
                    id="sw-ward"
                    className={styles.selectControl}
                    value={wardId ?? ""}
                    onChange={(e) => setWardId(e.target.value || null)}
                    disabled={!provinceId}
                >
                    <option value="">
                        {provinceId ? t("search.wardAllOption") : t("search.wardDisabledOption")}
                    </option>
                    {wardOptions.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="sw-checkin">
                    <CalendarBlankIcon size={14} weight="bold" /> {t("search.checkinLabel")}
                </label>
                <input
                    id="sw-checkin"
                    type="date"
                    className={styles.dateControl}
                    value={checkin}
                    min={minCheckin}
                    onChange={(e) => handleCheckinChange(e.target.value)}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="sw-checkout">
                    <CalendarBlankIcon size={14} weight="bold" /> {t("search.checkoutLabel")}
                </label>
                <input
                    id="sw-checkout"
                    type="date"
                    className={styles.dateControl}
                    value={checkout}
                    min={minCheckout}
                    onChange={(e) => setCheckout(e.target.value)}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="sw-guests">
                    <UsersIcon size={14} weight="bold" /> {t("search.guestsLabel")}
                </label>
                <Stepper
                    value={guests}
                    min={1}
                    max={12}
                    onChange={setGuests}
                    formatValue={(v) => t("search.guestsValue", { count: v })}
                    ariaLabel={t("search.guestsLabel")}
                />
            </div>

            <button type="submit" className={styles.submit}>
                <MagnifyingGlassIcon size={16} weight="bold" />
                {submitLabel ?? t("search.submitBook")}
            </button>
        </form>
    );
}
