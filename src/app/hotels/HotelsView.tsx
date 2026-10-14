"use client";

import { useEffect, useState } from "react";
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
import HotelCardSkeleton from "./HotelCardSkeleton";
import LoadError from "@/components/LoadError/LoadError";
import styles from "./HotelsView.module.css";

const PAGE_SIZE = 12;

// Trang danh sách khách sạn — dùng chung useHotelFilters/useGeolocation với
// trang Map (đã được nâng lên src/hooks/ vì có từ 2 trang dùng trở lên) để
// có cùng bộ lọc tỉnh/xã, ngày/khách và tìm quanh đây bằng GPS. Không truyền
// flyTo thật vì trang này không có bản đồ, nên cũng không bao giờ lọc theo
// khung nhìn (bounds luôn null) — luôn hiện hết những gì đã tải.
export default function HotelsView() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState("");
    // Debounce ô tìm theo tên trước khi truyền xuống hook — tên gõ được
    // chuyển thẳng xuống backend (filter `name~'*...*'`) nên gõ tới đâu gọi
    // API tới đó sẽ rất tốn, đợi người dùng ngừng gõ ~350ms mới fetch.
    const [debouncedQuery, setDebouncedQuery] = useState("");
    useEffect(() => {
        const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
        return () => clearTimeout(id);
    }, [searchQuery]);

    const {
        filters,
        selectedProvince,
        filteredHotels,
        loading,
        loadError,
        retry,
        handleFilterSubmit,
        clearProvince,
        nearby,
        startNearbySearch,
        bookHotel,
        isRemotePaginated,
        remotePage,
        remoteTotalPages,
        remoteTotal,
        setRemotePage,
    } = useHotelFilters(searchParams, "/hotels", { serverPaginate: true, query: debouncedQuery });

    const { isLocating, geoError, findNearby } = useGeolocation({
        t,
        onLocate: startNearbySearch,
        flyTo: () => {},
    });

    // Ở chế độ phân trang server (duyệt toàn quốc, không tìm quanh đây),
    // filteredHotels từ hook ĐÃ ĐÚNG LÀ trang hiện tại (backend trả sẵn),
    // không cần cắt lại; các trường hợp còn lại (đã chọn tỉnh, đang tìm
    // quanh đây) filteredHotels là TOÀN BỘ kết quả khớp, tự cắt trang ở đây
    // như trước — vì tập đó thường nhỏ (vài chục), không cần gọi lại API.
    const [localPage, setLocalPage] = useState(1);
    const localTotalPages = Math.max(1, Math.ceil(filteredHotels.length / PAGE_SIZE));
    const currentLocalPage = Math.min(localPage, localTotalPages);

    const currentPage = isRemotePaginated ? remotePage : currentLocalPage;
    const totalPages = isRemotePaginated ? remoteTotalPages : localTotalPages;
    const totalResultCount = isRemotePaginated ? remoteTotal : filteredHotels.length;
    const pageHotels = isRemotePaginated
        ? filteredHotels
        : filteredHotels.slice((currentLocalPage - 1) * PAGE_SIZE, currentLocalPage * PAGE_SIZE);
    const onPageChange = isRemotePaginated ? setRemotePage : setLocalPage;

    // Về trang 1 mỗi khi bộ lọc đổi — chỉnh state ngay trong lúc render (theo
    // khuyến nghị của React, giống HotelDetail) thay vì dùng effect. Trang
    // của chế độ phân trang server tự reset bên trong hook (theo cùng phạm
    // vi lọc), chỉ cần lo trang cục bộ ở đây.
    const nearbyKey = nearby ? `${nearby.lat},${nearby.lng}` : "";
    const filterSignature = [filters.provinceId, filters.wardId, nearbyKey, debouncedQuery].join("|");
    const [lastFilterSignature, setLastFilterSignature] = useState(filterSignature);
    if (filterSignature !== lastFilterSignature) {
        setLastFilterSignature(filterSignature);
        setLocalPage(1);
    }

    const resultLabel = (() => {
        if (nearby) return t("map.withinRadius", { radius: nearby.radiusKm });
        return selectedProvince ? t("map.at", { place: selectedProvince.name }) : t("map.nationwide");
    })();

    const canClear = Boolean(selectedProvince) || Boolean(nearby);

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
                    {/* Lỗi tải thì không hiện "0 khách sạn" — dễ hiểu nhầm là bộ lọc không khớp. */}
                    <span>
                        {!loadError && (
                            <>
                                <strong>{totalResultCount}</strong> {t("map.hotelsSuffix")}
                                {resultLabel}
                            </>
                        )}
                    </span>
                    {canClear && (
                        <button type="button" className={styles.clearButton} onClick={clearProvince}>
                            {t("map.clearFilter")}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className={styles.grid} aria-busy="true" aria-label={t("hotels.loading")}>
                        {Array.from({ length: 8 }, (_, i) => (
                            <HotelCardSkeleton key={i} />
                        ))}
                    </div>
                ) : loadError ? (
                    <LoadError onRetry={retry} />
                ) : pageHotels.length > 0 ? (
                    <div className={styles.grid}>
                        {pageHotels.map((hotel) => (
                            <HotelCard
                                key={hotel.id}
                                hotel={hotel}
                                distanceKm={
                                    nearby
                                        ? haversineDistanceKm(
                                              nearby.lat,
                                              nearby.lng,
                                              Number(hotel.latitude),
                                              Number(hotel.longitude)
                                          )
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

                <Pagination page={currentPage} totalPages={totalPages} onChange={onPageChange} />
            </div>
        </div>
    );
}
