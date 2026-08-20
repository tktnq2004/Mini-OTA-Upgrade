"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import { hotels } from "@/data/hotels.data";
import { getProvinceById } from "@/data/locations.data";
import {
    filtersToSearchParams,
    locationSearchParams,
    parseFilters,
    type SearchFilters,
} from "@/lib/searchFilters";
import { haversineDistanceKm, isInsideBounds, type BoundsBox } from "@/lib/geo";

const DEFAULT_PROVINCE_ID = "79"; // Hồ Chí Minh

export type ViewMode =
    | { type: "province" }
    | { type: "bounds"; bounds: BoundsBox }
    | { type: "radius"; lat: number; lng: number; radiusKm: number };

// Quản lý bộ lọc tỉnh/xã (đồng bộ hai chiều với URL), viewMode (province /
// khung nhìn bản đồ / bán kính quanh vị trí) và danh sách khách sạn lọc theo
// viewMode hiện tại. Dùng chung cho mọi trang cần tìm/lọc khách sạn (Map,
// Hotels) — không gắn với vòng đời của bất kỳ bản đồ MapLibre cụ thể nào,
// nên trang không có bản đồ (vd. /hotels) tái sử dụng nguyên vẹn, chỉ đơn
// giản là viewMode "bounds" (lọc theo khung nhìn khi kéo map) sẽ không bao
// giờ được kích hoạt vì không có nơi nào gọi setViewMode({type:"bounds"}).
//
// basePath: route mà bộ lọc sẽ ghi lại vào URL (router.replace) — mỗi trang
// gọi hook này phải tự truyền path của chính nó, nếu không sẽ bị đẩy nhầm
// sang path của trang khác khi submit.
export function useHotelFilters(searchParams: ReadonlyURLSearchParams, basePath: string) {
    const router = useRouter();

    const [filters, setFilters] = useState<SearchFilters>(() => {
        const parsed = parseFilters(searchParams);
        return parsed.provinceId ? parsed : { ...parsed, provinceId: DEFAULT_PROVINCE_ID };
    });
    const [viewMode, setViewMode] = useState<ViewMode>({ type: "province" });

    const paramsKey = searchParams.toString();
    const [syncedParamsKey, setSyncedParamsKey] = useState(paramsKey);
    if (paramsKey !== syncedParamsKey) {
        setSyncedParamsKey(paramsKey);
        // URL của trang chỉ mang tỉnh/xã (xem locationSearchParams) — ngày
        // nhận/trả và số khách không nằm trong URL nữa nên KHÔNG ghi đè lại
        // từ đây, chỉ đồng bộ 2 trường địa điểm, giữ nguyên phần còn lại
        // người dùng đang chỉnh trên form.
        const parsed = parseFilters(searchParams);
        setFilters((current) => ({ ...current, provinceId: parsed.provinceId, wardId: parsed.wardId }));
        setViewMode({ type: "province" });
    }

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
        router.replace(`${basePath}?${params.toString()}`, { scroll: false });
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
