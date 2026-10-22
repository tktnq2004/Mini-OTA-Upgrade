"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useHotelFilters } from "@/hooks/useHotelFilters";
import LoadError from "@/components/LoadError/LoadError";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMapInstance } from "./_hooks/useMapInstance";
import MapOverlay from "./_components/MapOverlay";
import { PROVINCE_ZOOM, VIETNAM_CENTER, VIETNAM_ZOOM, WARD_ZOOM } from "./_lib/mapConstants";
import styles from "./Map.module.css";

export default function MapView() {
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();

    const {
        filters,
        bounds,
        setBounds,
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
    } = useHotelFilters(searchParams, "/map");

    const [searchQuery, setSearchQuery] = useState("");

    // Đo mép dưới của lớp overlay (thanh tìm kiếm) để popup marker biết chỗ
    // nào đang bị che mà tránh mở lên đó — xem _components/popupAnchor.ts.
    const overlayRef = useRef<HTMLDivElement | null>(null);

    const { mapContainerRef, flyTo } = useMapInstance({
        initialProvinceId: filters.provinceId,
        hotels: filteredHotels,
        language,
        bookLabel: t("map.viewRoomsAndBook"),
        noPriceLabel: t("map.viewHotelMarker"),
        onBookHotel: bookHotel,
        onViewportChange: setBounds,
        getOverlayBottomPx: () => overlayRef.current?.getBoundingClientRect().bottom ?? 0,
    });

    const { isLocating, geoError, findNearby } = useGeolocation({
        t,
        onLocate: startNearbySearch,
        flyTo,
    });

    // /map?nearby=1 (vd. nút "Tìm quanh tôi" ở trang chủ): tự chạy "Tìm quanh đây" đúng 1 lần.
    const wantsNearby = searchParams.get("nearby") === "1";
    const nearbyStartedRef = useRef(false);
    useEffect(() => {
        if (!wantsNearby || nearbyStartedRef.current) return;
        nearbyStartedRef.current = true;
        findNearby();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wantsNearby]);

    // Bay bản đồ tới tỉnh/thành khi bộ lọc địa điểm đổi. Phụ thuộc cả wardId
    // để đổi xã (giữ nguyên tỉnh) cũng bay lại. Dữ liệu xã chưa có toạ độ riêng nên vẫn bay
    // tới tâm tỉnh, nhưng zoom sâu hơn khi đã chọn xã cụ thể để người dùng
    // thấy rõ có phản hồi. Bỏ qua khi đang "Tìm quanh đây" — useGeolocation đã
    // tự bay tới vị trí GPS (startNearbySearch xoá provinceId, nếu không chặn
    // ở đây sẽ bị kéo ngược về tâm Việt Nam).
    // Theo dõi "có đang lọc theo khung nhìn không" (boolean) thay vì cả object
    // bounds — bounds đổi mỗi lần kéo, nhưng effect chỉ cần biết lúc bật/tắt.
    const hasBounds = bounds !== null;
    useEffect(() => {
        if (hasBounds || nearby) return;

        if (selectedProvince && Number.isFinite(selectedProvince.lat)) {
            flyTo([selectedProvince.lng, selectedProvince.lat], filters.wardId ? WARD_ZOOM : PROVINCE_ZOOM);
        } else {
            flyTo(VIETNAM_CENTER, VIETNAM_ZOOM);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.provinceId, filters.wardId, hasBounds, nearby]);

    const resultLabel = (() => {
        if (hasBounds) return t("map.inThisArea");
        if (nearby) return t("map.withinRadius", { radius: nearby.radiusKm });
        return selectedProvince ? t("map.at", { place: selectedProvince.name }) : t("map.nationwide");
    })();

    const canClear = hasBounds || Boolean(selectedProvince) || Boolean(nearby);

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.mapArea}>
                <div ref={mapContainerRef} className={styles.mapContainer} />

                <div ref={overlayRef}>
                    <MapOverlay
                        filters={filters}
                        onFilterSubmit={handleFilterSubmit}
                        submitLabel={t("search.submitFind")}
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                        onFindNearby={findNearby}
                        isLocating={isLocating}
                        geoError={geoError}
                        loading={loading}
                        resultCount={filteredHotels.length}
                        resultLabel={resultLabel}
                        canClear={canClear}
                        onClear={clearProvince}
                        t={t}
                    />
                </div>

                {loadError && (
                    <div className={styles.mapError}>
                        <LoadError compact onRetry={retry} />
                    </div>
                )}
            </div>
        </div>
    );
}
