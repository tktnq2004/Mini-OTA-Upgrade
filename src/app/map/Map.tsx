"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import { Map as MapLibreMap, Marker, Popup, type MapLibreEvent } from "maplibre-gl";
import { createRoot, type Root } from "react-dom/client";
import {
    NavigationArrowIcon,
    CircleNotchIcon,
    MagnifyingGlassIcon,
    XCircleIcon,
} from "@phosphor-icons/react";
import "maplibre-gl/dist/maplibre-gl.css";
import { hotels, type Hotel } from "@/data/hotels.data";
import { getProvinceById, resolveHotelProvinceId } from "@/data/locations.data";
import { filtersToSearchParams, parseFilters, type SearchFilters } from "@/lib/searchFilters";
import { haversineDistanceKm, isInsideBounds, type BoundsBox } from "@/lib/geo";
import SiteHeader from "@/components/SiteHeader";
import SearchWidget from "@/components/SearchWidget";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import HotelPopupCard from "./HotelPopupCard";
import styles from "./Map.module.css";

const VIETNAM_CENTER: [number, number] = [106.7009, 10.7769];
const VIETNAM_ZOOM = 12.5;
const PROVINCE_ZOOM = 12;
const NEARBY_ZOOM = 13;
const NEARBY_RADIUS_KM = 10;

// Nếu người dùng vào thẳng /map mà không qua bộ lọc ở Home (không có
// ?province= trên URL), mặc định coi như đang tìm ở Hồ Chí Minh (mã "79").
const DEFAULT_MAP_PROVINCE_ID = "79";

const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/019fbdda-12e2-7c5a-966f-6c8de6b48a1c/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`;

interface MarkerEntry {
    marker: Marker;
    popup: Popup;
    root: Root;
}

// 3 cách xác định "đang xem khu vực nào" — về sau map thẳng sang tham số gọi
// API thật (bounds/tỉnh-xã/bán kính), chỉ 1 cách có hiệu lực tại một thời điểm.
type ViewMode =
    | { type: "province" }
    | { type: "bounds"; bounds: BoundsBox }
    | { type: "radius"; lat: number; lng: number; radiusKm: number };

function disposeMarkerEntries(entries: MarkerEntry[]) {
    entries.forEach(({ marker, popup, root }) => {
        popup.remove();
        marker.remove();
        // Nếu component cha (Map) unmount cùng lúc (vd. điều hướng sang trang
        // khách sạn), React vẫn đang trong commit phase của lần unmount đó —
        // gọi root.unmount() đồng bộ ngay lúc này bị React cảnh báo "Attempted
        // to synchronously unmount a root while React was already rendering".
        // Dời sang tick kế tiếp để tránh việc unmount một React root lồng
        // trong khi cây React cha cũng đang được unmount.
        setTimeout(() => root.unmount(), 0);
    });
}

export default function MapView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();

    const [filters, setFilters] = useState<SearchFilters>(() => {
        const parsed = parseFilters(searchParams);
        // Mặc định HCM chỉ áp dụng cho lần mở trang đầu tiên khi URL không có
        // province — không áp dụng lại mỗi khi searchParams đổi (xem effect
        // đồng bộ bên dưới), nếu không nút "Xem tất cả" sẽ không bao giờ thật
        // sự về trạng thái "toàn quốc" được.
        return parsed.provinceId ? parsed : { ...parsed, provinceId: DEFAULT_MAP_PROVINCE_ID };
    });
    const [viewMode, setViewMode] = useState<ViewMode>({ type: "province" });
    const [searchQuery, setSearchQuery] = useState("");
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState("");

    const paramsKey = searchParams.toString();
    const [syncedParamsKey, setSyncedParamsKey] = useState(paramsKey);
    if (paramsKey !== syncedParamsKey) {
        setSyncedParamsKey(paramsKey);
        setFilters(parseFilters(searchParams));
        setViewMode({ type: "province" });
    }

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const markersRef = useRef<MarkerEntry[]>([]);
    const filtersRef = useRef(filters);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const selectedProvince = getProvinceById(filters.provinceId);

    const filteredHotels = useMemo(() => {
        switch (viewMode.type) {
            case "bounds":
                return hotels.filter((hotel) => isInsideBounds(hotel.lat, hotel.lng, viewMode.bounds));
            case "radius":
                return hotels.filter(
                    (hotel) =>
                        haversineDistanceKm(viewMode.lat, viewMode.lng, hotel.lat, hotel.lng) <=
                        viewMode.radiusKm
                );
            case "province":
            default:
                if (!filters.provinceId) return hotels;
                return hotels.filter(
                    (hotel) => resolveHotelProvinceId(hotel.cityId) === filters.provinceId
                );
        }
    }, [viewMode, filters.provinceId]);

    const handleBookHotel = (hotelId: number) => {
        const params = filtersToSearchParams(filtersRef.current);
        router.push(`/hotel/${hotelId}?${params.toString()}`);
    };

    const handleFilterSubmit = (next: SearchFilters) => {
        setFilters(next);
        setViewMode({ type: "province" });
        const params = filtersToSearchParams(next);
        router.replace(`/map?${params.toString()}`, { scroll: false });
    };

    const clearProvince = () => {
        handleFilterSubmit({ ...filters, provinceId: null, wardId: null });
    };

    const requestGeolocation = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                const { latitude, longitude } = position.coords;
                setViewMode({ type: "radius", lat: latitude, lng: longitude, radiusKm: NEARBY_RADIUS_KM });
                mapRef.current?.flyTo({ center: [longitude, latitude], zoom: NEARBY_ZOOM, duration: 1000 });
            },
            (error: GeolocationPositionError) => {
                setIsLocating(false);
                setGeoError(
                    error.code === error.PERMISSION_DENIED
                        ? t("map.geolocationBlocked")
                        : t("map.geolocationDenied")
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleFindNearby = async () => {
        setGeoError("");

        if (!navigator.geolocation) {
            setGeoError(t("map.geolocationUnsupported"));
            return;
        }

        if (!window.isSecureContext) {
            setGeoError(t("map.geolocationInsecureContext"));
            return;
        }

        // Nếu quyền đã bị từ chối từ trước, gọi getCurrentPosition sẽ lỗi
        // ngay lập tức mà KHÔNG hiện lại hộp thoại xin quyền — kiểm tra trước
        // để báo đúng nguyên nhân (cần vào cài đặt trình duyệt tự bật lại)
        // thay vì để người dùng tưởng nút bị lỗi. Safari chưa hỗ trợ query
        // "geolocation" nên bọc try/catch, lỗi thì cứ thử xin như bình thường.
        if (navigator.permissions?.query) {
            try {
                const status = await navigator.permissions.query({ name: "geolocation" });
                if (status.state === "denied") {
                    setGeoError(t("map.geolocationBlocked"));
                    return;
                }
            } catch {
                // bỏ qua, chuyển sang gọi getCurrentPosition trực tiếp bên dưới
            }
        }

        requestGeolocation();
    };

    // Khởi tạo bản đồ một lần
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const initialProvince = getProvinceById(filtersRef.current.provinceId);
        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAPTILER_STYLE_URL,
            center: initialProvince ? [initialProvince.lng, initialProvince.lat] : VIETNAM_CENTER,
            zoom: initialProvince ? PROVINCE_ZOOM : VIETNAM_ZOOM,
        });

        map.addControl(new maplibregl.NavigationControl(), "bottom-right");
        map.addControl(new maplibregl.ScaleControl(), "bottom-left");

        // Chỉ chuyển sang lọc-theo-khung-nhìn khi CHÍNH người dùng kéo/zoom
        // (có originalEvent) — flyTo gọi từ code (chọn tỉnh, tìm quanh đây)
        // cũng bắn moveend nhưng không có originalEvent nên bỏ qua, tránh
        // việc tự ghi đè lại chế độ vừa chọn.
        const handleMoveEnd = (e: MapLibreEvent<MouseEvent | TouchEvent | WheelEvent | undefined>) => {
            if (!e.originalEvent) return;
            const b = map.getBounds();
            setViewMode({
                type: "bounds",
                bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
            });
        };
        map.on("moveend", handleMoveEnd);

        mapRef.current = map;

        return () => {
            map.off("moveend", handleMoveEnd);
            disposeMarkerEntries(markersRef.current);
            markersRef.current = [];
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Vẽ lại marker mỗi khi danh sách khách sạn theo bộ lọc thay đổi
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        disposeMarkerEntries(markersRef.current);
        markersRef.current = [];

        const bookLabel = t("map.viewRoomsAndBook");

        filteredHotels.forEach((hotel: Hotel) => {
            const popupNode = document.createElement("div");
            const root = createRoot(popupNode);
            root.render(
                <HotelPopupCard hotel={hotel} onBook={() => handleBookHotel(hotel.id)} bookLabel={bookLabel} />
            );

            const popup = new maplibregl.Popup({ offset: 25, maxWidth: "260px" }).setDOMContent(
                popupNode
            );

            const marker = new maplibregl.Marker({ color: "#2563eb" })
                .setLngLat([hotel.lng, hotel.lat])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push({ marker, popup, root });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredHotels, language]);

    // Bay bản đồ tới tỉnh/thành khi bộ lọc địa điểm đổi (chế độ "province")
    useEffect(() => {
        const map = mapRef.current;
        if (!map || viewMode.type !== "province") return;

        if (selectedProvince) {
            map.flyTo({ center: [selectedProvince.lng, selectedProvince.lat], zoom: PROVINCE_ZOOM, duration: 1000 });
        } else {
            map.flyTo({ center: VIETNAM_CENTER, zoom: VIETNAM_ZOOM, duration: 1000 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.provinceId]);

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

                <div className={styles.overlay}>
                    <SearchWidget
                        variant="bar"
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
                                    aria-label={t("hotel.resetFilters")}
                                >
                                    <XCircleIcon size={15} weight="fill" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            className={styles.nearbyButton}
                            onClick={handleFindNearby}
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
                            <strong>{filteredHotels.length}</strong> {t("map.hotelsSuffix")}
                            {resultLabel}
                        </span>
                        {canClear && (
                            <button type="button" className={styles.clearChip} onClick={clearProvince}>
                                {t("map.clearFilter")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
