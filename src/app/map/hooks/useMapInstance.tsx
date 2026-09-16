"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { Map as MapLibreMap, type GeoJSONSource, type MapLayerMouseEvent, type MapLibreEvent, type Popup } from "maplibre-gl";
import { createRoot, type Root } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import type { Hotel } from "@/lib/hotels/types";
import { formatCompactVnd } from "@/lib/format";
import { getProvinceById } from "@/data/locations.data";
import type { BoundsBox } from "@/lib/geo";
import HotelPopupCard from "../HotelPopupCard";
import { ensureHotelMarkerIcons, hotelMarkerIconId } from "../components/HotelMarkerBadge";
import { MAPTILER_STYLE_URL, PROVINCE_ZOOM, VIETNAM_CENTER, VIETNAM_ZOOM } from "../mapConstants";

// Marker là 1 GeoJSON source + đúng 1 style layer "symbol", vẽ bằng các ảnh
// pill+đuôi+chữ đã dính liền thành 1 khối (xem components/HotelMarkerBadge —
// lý do bake chữ vào ảnh thay vì dùng text-field của MapLibre được giải
// thích ở đó: icon và text của 1 symbol layer được vẽ ở 2 pass GPU riêng
// biệt, khiến chữ marker A có thể trồi lên icon marker B dù icon-vs-icon đã
// đè đúng thứ tự).
//
// Không dùng maplibregl.Marker DOM — bấm vào mở popup neo cạnh marker
// (maplibregl.Popup, giống bản gốc). Đã thử clustering (gộp cụm có số đếm
// kiểu Google Maps) nhưng theo yêu cầu bỏ lại — hiện KHÔNG gom nhóm, mọi
// hotel luôn hiện riêng lẻ, cho phép đè lên nhau về hình ảnh (icon-allow-
// overlap: true).
const SOURCE_ID = "hotels";
const BUTTON_LAYER_ID = "hotels-button";

function hotelLabel(hotel: Hotel, noPriceLabel: string): string {
    return hotel.averagePrice != null ? formatCompactVnd(hotel.averagePrice) : noPriceLabel;
}

function hotelsToFeatureCollection(hotels: Hotel[], noPriceLabel: string): FeatureCollection<Point> {
    return {
        type: "FeatureCollection",
        features: hotels.map((hotel) => ({
            type: "Feature",
            id: hotel.id,
            geometry: { type: "Point", coordinates: [Number(hotel.longitude), Number(hotel.latitude)] },
            properties: { id: hotel.id, iconId: hotelMarkerIconId(hotelLabel(hotel, noPriceLabel)) },
        })),
    };
}

// Chỉ dùng nội bộ để dọn dẹp popup/React root đang mở khi mở popup khác hoặc
// unmount — không nơi nào khác cần type này.
interface OpenPopup {
    popup: Popup;
    root: Root;
}

function disposeOpenPopup(open: OpenPopup | null) {
    if (!open) return;
    open.popup.remove();
    setTimeout(() => open.root.unmount(), 0);
}

interface UseMapInstanceOptions {
    initialProvinceId: string | null;
    hotels: Hotel[];
    language: string;
    bookLabel: string;
    // Chữ hiện trên nút của hotel CHƯA có averagePrice (vd. "Xem"/"View") —
    // truyền vào thay vì hardcode để còn đổi theo ngôn ngữ đang chọn.
    noPriceLabel: string;
    onBookHotel: (hotelId: number) => void;
    onViewportChange: (bounds: BoundsBox) => void;
}

// Quản lý toàn bộ vòng đời của instance MapLibre: khởi tạo bản đồ một lần,
// cập nhật lại nguồn dữ liệu marker mỗi khi danh sách khách sạn đổi (chỉ
// setData, không xoá/vẽ lại layer), và dọn dẹp lúc unmount. Trả về `flyTo`
// để component cha điều khiển camera (chọn tỉnh, tìm quanh đây) mà không cần
// lộ trực tiếp instance bản đồ ra ngoài.
export function useMapInstance({
    initialProvinceId,
    hotels,
    language,
    bookLabel,
    noPriceLabel,
    onBookHotel,
    onViewportChange,
}: UseMapInstanceOptions) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const openPopupRef = useRef<OpenPopup | null>(null);

    const onViewportChangeRef = useRef(onViewportChange);
    const onBookHotelRef = useRef(onBookHotel);
    const hotelsRef = useRef(hotels);
    const bookLabelRef = useRef(bookLabel);
    const noPriceLabelRef = useRef(noPriceLabel);
    useEffect(() => {
        onViewportChangeRef.current = onViewportChange;
        onBookHotelRef.current = onBookHotel;
        hotelsRef.current = hotels;
        bookLabelRef.current = bookLabel;
        noPriceLabelRef.current = noPriceLabel;
    });

    const openPopupFor = (hotel: Hotel, coordinates: [number, number]) => {
        const map = mapRef.current;
        if (!map) return;
        disposeOpenPopup(openPopupRef.current);

        const popupNode = document.createElement("div");
        const root = createRoot(popupNode);
        root.render(
            <HotelPopupCard hotel={hotel} onBook={() => onBookHotelRef.current(hotel.id)} bookLabel={bookLabelRef.current} />
        );

        const popup = new maplibregl.Popup({ offset: 25, maxWidth: "260px" })
            .setLngLat(coordinates)
            .setDOMContent(popupNode)
            .addTo(map);
        popup.on("close", () => {
            if (openPopupRef.current?.popup === popup) openPopupRef.current = null;
        });

        openPopupRef.current = { popup, root };
    };

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

        map.on("load", () => {
            ensureHotelMarkerIcons(map, hotelsRef.current.map((h) => hotelLabel(h, noPriceLabelRef.current)));

            map.addSource(SOURCE_ID, {
                type: "geojson",
                data: hotelsToFeatureCollection(hotelsRef.current, noPriceLabelRef.current),
            });

            map.addLayer({
                id: BUTTON_LAYER_ID,
                type: "symbol",
                source: SOURCE_ID,
                layout: {
                    // Mỗi feature tự chọn đúng ảnh (pill+chữ đã dính liền)
                    // khớp nhãn giá của nó — xem ensureHotelMarkerIcons.
                    "icon-image": ["get", "iconId"],
                    // Đuôi nhọn (đáy ảnh) chạm đúng toạ độ hotel.
                    "icon-anchor": "bottom",
                    // Cho phép đè lên nhau, không tự ẩn/gom bất kỳ hotel nào —
                    // luôn hiện ĐỦ mọi hotel như yêu cầu.
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true,
                },
            });

            map.on("click", BUTTON_LAYER_ID, (e: MapLayerMouseEvent) => {
                const feature = e.features?.[0];
                if (!feature || feature.geometry.type !== "Point") return;
                const hotelId = feature.properties?.id as number | undefined;
                const hotel = hotelsRef.current.find((h) => h.id === hotelId);
                if (!hotel) return;
                openPopupFor(hotel, feature.geometry.coordinates as [number, number]);
            });
            map.on("mouseenter", BUTTON_LAYER_ID, () => {
                map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", BUTTON_LAYER_ID, () => {
                map.getCanvas().style.cursor = "";
            });
        });

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
            disposeOpenPopup(openPopupRef.current);
            openPopupRef.current = null;
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cập nhật lại nguồn dữ liệu marker mỗi khi danh sách khách sạn theo bộ
    // lọc (hoặc ngôn ngữ, đổi nhãn "Xem"/"View") đổi — đăng ký thêm ảnh cho
    // nhãn giá MỚI (nếu có) rồi mới setData (rẻ, không xoá/vẽ lại layer). Nếu
    // style bản đồ chưa load xong (source chưa tồn tại), bỏ qua — map.on
    // ("load") ở trên đã tự lấy đúng hotelsRef.current/noPriceLabelRef.current
    // mới nhất khi source được tạo lần đầu.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        ensureHotelMarkerIcons(map, hotels.map((h) => hotelLabel(h, noPriceLabel)));
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        source?.setData(hotelsToFeatureCollection(hotels, noPriceLabel));
    }, [hotels, language, noPriceLabel]);

    const flyTo = (center: [number, number], zoom: number) => {
        mapRef.current?.flyTo({ center, zoom, duration: 1000 });
    };

    return { mapContainerRef, flyTo };
}
