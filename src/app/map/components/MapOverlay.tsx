"use client";

import {
    NavigationArrowIcon,
    CircleNotchIcon,
    MagnifyingGlassIcon,
    XCircleIcon,
} from "@phosphor-icons/react";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import type { SearchFilters } from "@/lib/searchFilters";
import styles from "../Map.module.css";

interface MapOverlayProps {
    filters: SearchFilters;
    onFilterSubmit: (next: SearchFilters) => void;
    submitLabel: string;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    onFindNearby: () => void;
    isLocating: boolean;
    geoError: string;
    resultCount: number;
    resultLabel: string;
    canClear: boolean;
    onClear: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

// Lớp UI phủ trên bản đồ: thanh tìm kiếm theo tỉnh/xã, ô tìm theo tên, nút
// tìm quanh đây và chip hiển thị số kết quả. Thuần trình bày — mọi state đến
// từ Map.tsx qua props.
export default function MapOverlay({
    filters,
    onFilterSubmit,
    submitLabel,
    searchQuery,
    onSearchQueryChange,
    onFindNearby,
    isLocating,
    geoError,
    resultCount,
    resultLabel,
    canClear,
    onClear,
    t,
}: MapOverlayProps) {
    return (
        <div className={styles.overlay}>
            <SearchWidget
                variant="bar"
                initialFilters={filters}
                onSubmit={onFilterSubmit}
                submitLabel={submitLabel}
            />

            <div className={styles.toolRow}>
                <div className={styles.searchBox}>
                    <MagnifyingGlassIcon size={15} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={t("map.searchByNamePlaceholder")}
                        aria-label={t("map.searchByNameLabel")}
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className={styles.searchClear}
                            onClick={() => onSearchQueryChange("")}
                            aria-label={t("hotel.resetFilters")}
                        >
                            <XCircleIcon size={15} weight="fill" />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className={styles.nearbyButton}
                    onClick={onFindNearby}
                    disabled={isLocating}
                >
                    {isLocating ? (
                        <CircleNotchIcon size={15} weight="bold" className={styles.spin} />
                    ) : (
                        <NavigationArrowIcon size={15} weight="bold" />
                    )}
                    {isLocating ? t("map.locating") : t("map.findNearby")}
                </button>
            </div>

            {geoError && <p className={styles.geoError}>{geoError}</p>}

            <div className={styles.resultChip}>
                <span>
                    <strong>{resultCount}</strong> {t("map.hotelsSuffix")}
                    {resultLabel}
                </span>
                {canClear && (
                    <button type="button" className={styles.clearChip} onClick={onClear}>
                        {t("map.clearFilter")}
                    </button>
                )}
            </div>
        </div>
    );
}
