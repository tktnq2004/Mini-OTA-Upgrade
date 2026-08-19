"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { Map as MapLibreMap, type MapLibreEvent, type Marker, type Popup } from "maplibre-gl";
import { createRoot, type Root } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Hotel } from "@/data/hotels.data";
import { getProvinceById } from "@/data/locations.data";
import type { BoundsBox } from "@/lib/geo";
import HotelPopupCard from "../HotelPopupCard";
import { MAPTILER_STYLE_URL, PROVINCE_ZOOM, VIETNAM_CENTER, VIETNAM_ZOOM } from "../mapConstants";

// Chỉ dùng nội bộ để dọn dẹp marker/popup/React root khi vẽ lại hoặc unmount
// — không nơi nào khác cần type này nên không tách ra file types riêng.
interface MarkerEntry {
    marker: Marker;
    popup: Popup;
    root: Root;
}

function disposeMarkerEntries(entries: MarkerEntry[]) {
    entries.forEach(({ marker, popup, root }) => {
        popup.remove();
        marker.remove();
        setTimeout(() => root.unmount(), 0);
    });
}

interface UseMapInstanceOptions {
    initialProvinceId: string | null;
    hotels: Hotel[];
    language: string;
    bookLabel: string;
    onBookHotel: (hotelId: number) => void;
    onViewportChange: (bounds: BoundsBox) => void;
}

// Quản lý toàn bộ vòng đời của instance MapLibre: khởi tạo bản đồ một lần,
// vẽ lại marker mỗi khi danh sách khách sạn đổi, và dọn dẹp lúc unmount.
// Trả về `flyTo` để component cha điều khiển camera (chọn tỉnh, tìm quanh
// đây) mà không cần lộ trực tiếp instance bản đồ ra ngoài.
export function useMapInstance({
    initialProvinceId,
    hotels,
    language,
    bookLabel,
    onBookHotel,
    onViewportChange,
}: UseMapInstanceOptions) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const markersRef = useRef<MarkerEntry[]>([]);

    const onViewportChangeRef = useRef(onViewportChange);
    const onBookHotelRef = useRef(onBookHotel);
    useEffect(() => {
        onViewportChangeRef.current = onViewportChange;
        onBookHotelRef.current = onBookHotel;
    });

    // Khởi tạo bản đồ một lần
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const initialProvince = getProvinceById(initialProvinceId);
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
            onViewportChangeRef.current({
                west: b.getWest(),
                south: b.getSouth(),
                east: b.getEast(),
                north: b.getNorth(),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Vẽ lại marker mỗi khi danh sách khách sạn theo bộ lọc thay đổi
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        disposeMarkerEntries(markersRef.current);
        markersRef.current = [];

        hotels.forEach((hotel: Hotel) => {
            const popupNode = document.createElement("div");
            const root = createRoot(popupNode);
            root.render(
                <HotelPopupCard
                    hotel={hotel}
                    onBook={() => onBookHotelRef.current(hotel.id)}
                    bookLabel={bookLabel}
                />
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
    }, [hotels, language, bookLabel]);

    const flyTo = (center: [number, number], zoom: number) => {
        mapRef.current?.flyTo({ center, zoom, duration: 1000 });
    };

    return { mapContainerRef, flyTo };
}
