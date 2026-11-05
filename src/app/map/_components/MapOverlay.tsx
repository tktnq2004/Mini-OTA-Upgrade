"use client";

import { useState } from "react";
import {
    CaretDownIcon,
    NavigationArrowIcon,
    CircleNotchIcon,
    MagnifyingGlassIcon,
    XCircleIcon,
} from "@phosphor-icons/react";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import Skeleton from "@/components/Skeleton/Skeleton";
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
    // Đang tải danh sách khách sạn — chip hiện số xương thay vì "0" sai.
    loading: boolean;
    resultCount: number;
    resultLabel: string;
    // Tóm tắt tìm kiếm hiện tại, hiện thay cho cả form khi thu gọn trên mobile.
    searchSummary: string;
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
    loading,
    resultCount,
    resultLabel,
    searchSummary,
    canClear,
    onClear,
    t,
}: MapOverlayProps) {
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <div className={styles.overlay}>
            <button
                type="button"
                className={styles.searchToggle}
                aria-expanded={searchOpen}
                aria-controls="map-search-panel"
                aria-label={t("map.editSearch")}
                onClick={() => setSearchOpen((open) => !open)}
            >
                <MagnifyingGlassIcon size={16} weight="bold" />
                <span className={styles.searchSummary}>{searchSummary}</span>
                <CaretDownIcon size={14} weight="bold" className={searchOpen ? styles.caretOpen : undefined} />
            </button>

            <div id="map-search-panel" className={searchOpen ? styles.searchPanelOpen : styles.searchPanel}>
                <SearchWidget
                    variant="bar"
                    initialFilters={filters}
                    onSubmit={(next) => {
                        setSearchOpen(false);
                        onFilterSubmit(next);
                    }}
                    submitLabel={submitLabel}
                />
            </div>

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

            <div className={styles.resultChip} aria-busy={loading || undefined}>
                <span className={styles.resultText}>
                    {loading ? <Skeleton width={22} height={12} className={styles.resultCountSkeleton} /> : <strong>{resultCount}</strong>}
                    <span>
                        {t("map.hotelsSuffix")}
                        {resultLabel}
                    </span>
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
