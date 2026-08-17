"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import { hotels } from "@/data/hotels.data";
import { getProvinceById } from "@/data/locations.data";
import {
    filtersToSearchParams,
    locationSearchParams,
    parseFilters,
    type SearchFilters,
} from "@/lib/searchFilters";
import { haversineDistanceKm, isInsideBounds } from "@/lib/geo";
import { DEFAULT_MAP_PROVINCE_ID } from "../mapConstants";
import type { ViewMode } from "../types";

// Quản lý bộ lọc tỉnh/xã (đồng bộ hai chiều với URL), viewMode (province /
// khung nhìn bản đồ / bán kính quanh vị trí) và danh sách khách sạn lọc theo
// viewMode hiện tại. Tách khỏi Map.tsx vì đây là state độc lập với vòng đời
// bản đồ MapLibre.
export function useMapFilters(searchParams: ReadonlyURLSearchParams) {
    const router = useRouter();

    const [filters, setFilters] = useState<SearchFilters>(() => {
        const parsed = parseFilters(searchParams);
        // Mặc định HCM chỉ áp dụng cho lần mở trang đầu tiên khi URL không có
        // province — không áp dụng lại mỗi khi searchParams đổi (xem block
        // đồng bộ bên dưới), nếu không nút "Xem tất cả" sẽ không bao giờ thật
        // sự về trạng thái "toàn quốc" được.
        return parsed.provinceId ? parsed : { ...parsed, provinceId: DEFAULT_MAP_PROVINCE_ID };
    });
    const [viewMode, setViewMode] = useState<ViewMode>({ type: "province" });

    const paramsKey = searchParams.toString();
    const [syncedParamsKey, setSyncedParamsKey] = useState(paramsKey);
    if (paramsKey !== syncedParamsKey) {
        setSyncedParamsKey(paramsKey);
        // URL của /map chỉ mang tỉnh/xã (xem locationSearchParams) — ngày
        // nhận/trả và số khách không nằm trong URL nữa nên KHÔNG ghi đè lại
        // từ đây, chỉ đồng bộ 2 trường địa điểm, giữ nguyên phần còn lại
        // người dùng đang chỉnh trên form.
        const parsed = parseFilters(searchParams);
        setFilters((current) => ({ ...current, provinceId: parsed.provinceId, wardId: parsed.wardId }));
        setViewMode({ type: "province" });
    }

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

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
                return hotels.filter((hotel) => hotel.provinceId === filters.provinceId);
        }
    }, [viewMode, filters.provinceId]);

    const handleFilterSubmit = (next: SearchFilters) => {
        setFilters(next);
        setViewMode({ type: "province" });
        // Chỉ tỉnh/xã lên URL — ngày nhận/trả, số khách vẫn được giữ trong
        // filters (React state) để dùng lúc bấm "đặt phòng", không phải là
        // tham số tìm kiếm nên không ghi vào query string.
        const params = locationSearchParams(next);
        router.replace(`/map?${params.toString()}`, { scroll: false });
    };

    const clearProvince = () => {
        handleFilterSubmit({ ...filters, provinceId: null, wardId: null });
    };

    const bookHotel = (hotelId: number) => {
        const params = filtersToSearchParams(filtersRef.current);
        router.push(`/hotel/${hotelId}?${params.toString()}`);
    };

    return {
        filters,
        viewMode,
        setViewMode,
        selectedProvince,
        filteredHotels,
        handleFilterSubmit,
        clearProvince,
        bookHotel,
    };
}
