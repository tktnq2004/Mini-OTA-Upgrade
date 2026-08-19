"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    MagnifyingGlassIcon,
    XCircleIcon,
    NavigationArrowIcon,
    CircleNotchIcon,
    SmileyMehIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import Pagination from "@/components/Pagination/Pagination";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useHotelFilters } from "@/hooks/useHotelFilters";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistanceKm } from "@/lib/geo";
import HotelCard from "./HotelCard";
import styles from "./HotelsView.module.css";

const PAGE_SIZE = 12;

// Trang danh sách khách sạn — dùng chung useHotelFilters/useGeolocation với
// trang Map (đã được nâng lên src/hooks/ vì có từ 2 trang dùng trở lên) để
// có cùng bộ lọc tỉnh/xã, ngày/khách và tìm quanh đây bằng GPS. Không truyền
// flyTo thật vì trang này không có bản đồ, và không gắn sự kiện kéo/zoom map
// nên viewMode ở đây chỉ bao giờ là "province" hoặc "radius" — chế độ
// "bounds" (lọc theo khung nhìn khi kéo map) tự động không xảy ra, đúng như
// yêu cầu bỏ bộ lọc đó ở trang này.
export default function HotelsView() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();

    const {
        filters,
        viewMode,
        setViewMode,
        selectedProvince,
        filteredHotels,
        handleFilterSubmit,
        clearProvince,
        bookHotel,
    } = useHotelFilters(searchParams, "/hotels");

    const { isLocating, geoError, findNearby } = useGeolocation({
        t,
        setViewMode,
        flyTo: () => {},
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    const visibleHotels = (() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return filteredHotels;
        return filteredHotels.filter((h) => h.name.toLowerCase().includes(q));
    })();

    const totalPages = Math.max(1, Math.ceil(visibleHotels.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageHotels = visibleHotels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Về trang 1 mỗi khi bộ lọc đổi — chỉnh state ngay trong lúc render (theo
    // khuyến nghị của React, giống HotelDetail) thay vì dùng effect.
    const filterSignature = [filters.provinceId, filters.wardId, viewMode.type, searchQuery].join("|");
    const [lastFilterSignature, setLastFilterSignature] = useState(filterSignature);
    if (filterSignature !== lastFilterSignature) {
        setLastFilterSignature(filterSignature);
        setPage(1);
    }

    const resultLabel = (() => {
        if (viewMode.type === "radius") return t("map.withinRadius", { radius: viewMode.radiusKm });
        return selectedProvince ? t("map.at", { place: selectedProvince.name }) : t("map.nationwide");
    })();

    const canClear = viewMode.type !== "province" || Boolean(selectedProvince);

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <div className={styles.heading}>
                    <h1>{t("hotels.title")}</h1>
                    <p>{t("hotels.subtitle")}</p>
                </div>

                <div className={styles.filterPanel}>
                    <SearchWidget
                        variant="hero"
                        initialFilters={filters}
                        onSubmit={handleFilterSubmit}
                        submitLabel={t("search.submitFind")}
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
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className={styles.searchClear}
                                    onClick={() => setSearchQuery("")}
                                    aria-label={t("hotels.clearSearchText")}
                                >
                                    <XCircleIcon size={15} weight="fill" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            className={styles.nearbyButton}
                            onClick={findNearby}
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
                </div>

                <div className={styles.resultBar}>
                    <span>
                        <strong>{visibleHotels.length}</strong> {t("map.hotelsSuffix")}
                        {resultLabel}
                    </span>
                    {canClear && (
                        <button type="button" className={styles.clearButton} onClick={clearProvince}>
                            {t("map.clearFilter")}
                        </button>
                    )}
                </div>

                {pageHotels.length > 0 ? (
                    <div className={styles.grid}>
                        {pageHotels.map((hotel) => (
                            <HotelCard
                                key={hotel.id}
                                hotel={hotel}
                                distanceKm={
                                    viewMode.type === "radius"
                                        ? haversineDistanceKm(viewMode.lat, viewMode.lng, hotel.lat, hotel.lng)
                                        : null
                                }
                                onBook={() => bookHotel(hotel.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <SmileyMehIcon size={24} weight="light" />
                        <p>{t("hotels.emptyState")}</p>
                    </div>
                )}

                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
        </div>
    );
}
