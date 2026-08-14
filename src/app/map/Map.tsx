"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import { createRoot, type Root } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import { hotels, type Hotel } from "@/data/hotels.data";
import { getProvinceById, normalizeCityId } from "@/data/locations.data";
import { filtersToSearchParams, parseFilters, type SearchFilters } from "@/lib/searchFilters";
import SiteHeader from "@/components/SiteHeader";
import SearchWidget from "@/components/SearchWidget";
import HotelPopupCard from "./HotelPopupCard";
import styles from "./Map.module.css";

const VIETNAM_CENTER: [number, number] = [106.7009, 10.7769];
const VIETNAM_ZOOM = 12.5;
const PROVINCE_ZOOM = 12;

interface MarkerEntry {
    marker: Marker;
    popup: Popup;
    root: Root;
}

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
    const [filters, setFilters] = useState<SearchFilters>(() => parseFilters(searchParams));

    // Nếu URL đổi từ bên ngoài (link "Bản đồ" trên header, nút back/forward,
    // thẻ điểm đến ở Home...) trong khi component này vẫn đang mounted, nạp
    // lại filters từ query string ngay trong lúc render.
    const paramsKey = searchParams.toString();
    const [syncedParamsKey, setSyncedParamsKey] = useState(paramsKey);
    if (paramsKey !== syncedParamsKey) {
        setSyncedParamsKey(paramsKey);
        setFilters(parseFilters(searchParams));
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
        if (!filters.provinceId) return hotels;
        return hotels.filter((hotel) => normalizeCityId(hotel.cityId) === filters.provinceId);
    }, [filters.provinceId]);

    const handleBookHotel = (hotelId: number) => {
        const params = filtersToSearchParams(filtersRef.current);
        router.push(`/hotel/${hotelId}?${params.toString()}`);
    };

    const handleFilterSubmit = (next: SearchFilters) => {
        setFilters(next);
        const params = filtersToSearchParams(next);
        router.replace(`/map?${params.toString()}`, { scroll: false });
    };

    const clearProvince = () => {
        handleFilterSubmit({ ...filters, provinceId: null, wardId: null });
    };

    // Khởi tạo bản đồ một lần
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const initialProvince = getProvinceById(filtersRef.current.provinceId);
        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style:
                "https://api.maptiler.com/maps/019fbdda-12e2-7c5a-966f-6c8de6b48a1c/style.json?key=njTc0NudANwT2b4P8y7j",
            center: initialProvince ? [initialProvince.lng, initialProvince.lat] : VIETNAM_CENTER,
            zoom: initialProvince ? PROVINCE_ZOOM : VIETNAM_ZOOM,
        });

        map.addControl(new maplibregl.NavigationControl(), "bottom-right");
        map.addControl(new maplibregl.ScaleControl(), "bottom-left");

        mapRef.current = map;

        return () => {
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

        filteredHotels.forEach((hotel: Hotel) => {
            const popupNode = document.createElement("div");
            const root = createRoot(popupNode);
            root.render(<HotelPopupCard hotel={hotel} onBook={() => handleBookHotel(hotel.id)} />);

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
    }, [filteredHotels]);

    // Bay bản đồ tới tỉnh/thành được chọn khi bộ lọc địa điểm đổi
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (selectedProvince) {
            map.flyTo({ center: [selectedProvince.lng, selectedProvince.lat], zoom: PROVINCE_ZOOM, duration: 1000 });
        } else {
            map.flyTo({ center: VIETNAM_CENTER, zoom: VIETNAM_ZOOM, duration: 1000 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.provinceId]);

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
                        submitLabel="Tìm kiếm"
                    />

                    <div className={styles.resultChip}>
                        <span>
                            <strong>{filteredHotels.length}</strong> khách sạn
                            {selectedProvince ? ` tại ${selectedProvince.name}` : " trên toàn quốc"}
                        </span>
                        {selectedProvince && (
                            <button type="button" className={styles.clearChip} onClick={clearProvince}>
                                Xem tất cả
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
