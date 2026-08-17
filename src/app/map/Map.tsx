"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useMapFilters } from "./hooks/useMapFilters";
import { useMapInstance } from "./hooks/useMapInstance";
import { useGeolocation } from "./hooks/useGeolocation";
import MapOverlay from "./components/MapOverlay";
import { PROVINCE_ZOOM, VIETNAM_CENTER, VIETNAM_ZOOM, WARD_ZOOM } from "./mapConstants";
import styles from "./Map.module.css";

export default function MapView() {
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();

    const {
        filters,
        viewMode,
        setViewMode,
        selectedProvince,
        filteredHotels,
        handleFilterSubmit,
        clearProvince,
        bookHotel,
    } = useMapFilters(searchParams);

    const [searchQuery, setSearchQuery] = useState("");

    const { mapContainerRef, flyTo } = useMapInstance({
        initialProvinceId: filters.provinceId,
        hotels: filteredHotels,
        language,
        bookLabel: t("map.viewRoomsAndBook"),
        onBookHotel: bookHotel,
        onViewportChange: (bounds) => setViewMode({ type: "bounds", bounds }),
    });

    const { isLocating, geoError, findNearby } = useGeolocation({
        t,
        setViewMode,
        flyTo,
    });

    // Bay bản đồ tới tỉnh/thành khi bộ lọc địa điểm đổi (chế độ "province").
    // Phụ thuộc cả wardId — trước đây effect chỉ theo dõi provinceId nên đổi
    // xã (giữ nguyên tỉnh) không kích hoạt lại flyTo. Dữ liệu xã chưa có
    // toạ độ riêng nên vẫn bay tới tâm tỉnh, nhưng zoom sâu hơn khi đã chọn
    // xã cụ thể để người dùng thấy rõ có phản hồi.
    useEffect(() => {
        if (viewMode.type !== "province") return;

        if (selectedProvince) {
            flyTo([selectedProvince.lng, selectedProvince.lat], filters.wardId ? WARD_ZOOM : PROVINCE_ZOOM);
        } else {
            flyTo(VIETNAM_CENTER, VIETNAM_ZOOM);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.provinceId, filters.wardId, viewMode.type]);

    const resultLabel = (() => {
        if (viewMode.type === "bounds") return t("map.inThisArea");
        if (viewMode.type === "radius") return t("map.withinRadius", { radius: viewMode.radiusKm });
        return selectedProvince ? t("map.at", { place: selectedProvince.name }) : t("map.nationwide");
    })();

    const canClear = viewMode.type !== "province" || Boolean(selectedProvince);

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.mapArea}>
                <div ref={mapContainerRef} className={styles.mapContainer} />

                <MapOverlay
                    filters={filters}
                    onFilterSubmit={handleFilterSubmit}
                    submitLabel={t("search.submitFind")}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onFindNearby={findNearby}
                    isLocating={isLocating}
                    geoError={geoError}
                    resultCount={filteredHotels.length}
                    resultLabel={resultLabel}
                    canClear={canClear}
                    onClear={clearProvince}
                    t={t}
                />
            </div>
        </div>
    );
}
