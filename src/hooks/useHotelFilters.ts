"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import { listHotels } from "@/lib/hotels/client";
import type { Hotel } from "@/lib/hotels/types";
import { getProvinceById } from "@/data/locations.data";
import {
    filtersToSearchParams,
    locationSearchParams,
    parseFilters,
    type SearchFilters,
} from "@/lib/searchFilters";
import { haversineDistanceKm, isInsideBounds, type BoundsBox } from "@/lib/geo";

const DEFAULT_PROVINCE_ID = "79"; // Hồ Chí Minh

// Cỡ trang dùng để "dò" tổng số hotel thật (meta.total) trước khi quyết định
// tải hết — đa số trường hợp (1 tỉnh, kết quả tìm theo tên) đều dưới mốc
// này nên chỉ tốn ĐÚNG 1 lượt gọi API như trước; chỉ khi tổng thật > mốc này
// (vd. duyệt toàn quốc, ~500 hotel) mới gọi thêm 1 lượt thứ 2 với size = tổng
// thật. Tuyệt đối KHÔNG hardcode 1 cỡ cố định rồi lặng lẽ cắt bớt kết quả —
// đây chính là bug đã gặp (cỡ cố định 100 trong khi tổng đã lên 500).
const PROBE_SIZE = 100;

// Cỡ trang khi /hotels chuyển sang phân trang SERVER thật (duyệt toàn quốc,
// không tìm quanh đây) — xem usePagination bên dưới.
const PAGINATE_SIZE = 12;

export type ViewMode =
    | { type: "province" }
    | { type: "bounds"; bounds: BoundsBox }
    | { type: "radius"; lat: number; lng: number; radiusKm: number };

interface FetchScopeParams {
    provinceId?: string | null;
    wardId?: string | null;
    query?: string;
}

// Tải HẾT hotel khớp phạm vi (tỉnh/xã/tên) — dùng cho mọi trường hợp cần
// thấy toàn bộ ứng viên cùng lúc để lọc/hiển thị tiếp ở client: bản đồ (vẽ
// hết marker), chế độ "tìm quanh đây" (phải so khoảng cách với hết ứng viên
// mới lọc đúng bán kính), và /hotels khi đã thu hẹp phạm vi đủ nhỏ (đã chọn
// tỉnh, hoặc đang tìm theo tên). Dò tổng thật qua meta.total thay vì tin
// vào 1 cỡ cố định — xem PROBE_SIZE.
async function fetchAllMatching(params: FetchScopeParams): Promise<Hotel[]> {
    const first = await listHotels({ ...params, page: 1, size: PROBE_SIZE });
    if (first.meta.total <= first.result.length) return first.result;
    const full = await listHotels({ ...params, page: 1, size: first.meta.total });
    return full.result;
}

function hotelLatLng(hotel: Hotel): { lat: number; lng: number } {
    return { lat: Number(hotel.latitude), lng: Number(hotel.longitude) };
}

export interface UseHotelFiltersOptions {
    // Cho phép /hotels chuyển sang phân trang SERVER thật (gọi lại API mỗi
    // lần đổi trang, không tải hết) khi đang duyệt TOÀN QUỐC (không tỉnh,
    // không tìm quanh đây) — đúng chỗ trước đây bị cắt cứng còn 100 hotel.
    // /map luôn cần tải hết (vẽ marker phân bố cả nước) nên KHÔNG bật cờ
    // này — mặc định false.
    serverPaginate?: boolean;
    // Tìm theo tên — chuyển thẳng xuống backend (turkraft `name~'*...*'`)
    // thay vì lọc lại trong tập đã tải ở client, để tìm đúng trên TOÀN BỘ
    // hotel khớp phạm vi hiện tại, không chỉ trong những gì đã tải sẵn. Nên
    // debounce giá trị này trước khi truyền vào (tránh gọi API mỗi phím gõ).
    query?: string;
}

// Quản lý bộ lọc tỉnh/xã (đồng bộ hai chiều với URL), viewMode (province /
// khung nhìn bản đồ / bán kính quanh vị trí) và danh sách khách sạn lọc theo
// viewMode hiện tại — giờ tải thật từ backend thay vì lọc mảng mock trong bộ
// nhớ. Dùng chung cho mọi trang cần tìm/lọc khách sạn (Map, Hotels).
//
// basePath: route mà bộ lọc sẽ ghi lại vào URL (router.replace) — mỗi trang
// gọi hook này phải tự truyền path của chính nó, nếu không sẽ bị đẩy nhầm
// sang path của trang khác khi submit.
export function useHotelFilters(
    searchParams: ReadonlyURLSearchParams,
    basePath: string,
    options: UseHotelFiltersOptions = {}
) {
    const router = useRouter();
    const query = options.query?.trim() || undefined;

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

    // Duyệt TOÀN QUỐC (không tỉnh) mà không tìm quanh đây là trường hợp DUY
    // NHẤT được phép phân trang server thật — mọi trường hợp còn lại (đã
    // chọn tỉnh, đang tìm quanh đây, hoặc trang gọi hook không bật
    // serverPaginate như /map) đều cần tải hết để lọc/hiển thị đúng.
    const usePagination = Boolean(options.serverPaginate) && !filters.provinceId && viewMode.type !== "radius";

    // Trang hiện tại của chế độ phân trang server — reset về 1 mỗi khi phạm
    // vi lọc đổi (tỉnh/xã/tên) hoặc chuyển ra/vào chế độ phân trang, chỉnh
    // ngay trong lúc render (theo khuyến nghị của React) giống cách
    // paramsKey/syncedParamsKey ở trên xử lý, thay vì dùng thêm 1 effect.
    const [serverPage, setServerPage] = useState(1);
    const [serverTotal, setServerTotal] = useState(0);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    const pageScopeKey = `${filters.provinceId ?? ""}|${filters.wardId ?? ""}|${query ?? ""}|${usePagination}`;
    const [syncedPageScopeKey, setSyncedPageScopeKey] = useState(pageScopeKey);
    if (pageScopeKey !== syncedPageScopeKey) {
        setSyncedPageScopeKey(pageScopeKey);
        setServerPage(1);
    }

    // Tập khách sạn đã tải từ backend cho đúng phạm vi hiện tại — fetch lại
    // khi tỉnh/xã/tên đổi, hoặc (ở chế độ phân trang server) khi đổi trang.
    // KHÔNG fetch lại mỗi lần viewMode đổi kiểu bounds (kéo map / đổi bán
    // kính không gọi lại API, chỉ lọc tiếp trên tập đã tải).
    const [loadedHotels, setLoadedHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- tải khách sạn từ API theo phạm vi lọc hiện tại, một external system
        setLoading(true);

        const scope: FetchScopeParams = { provinceId: filters.provinceId, wardId: filters.wardId, query };

        if (usePagination) {
            listHotels({ ...scope, page: serverPage, size: PAGINATE_SIZE })
                .then((res) => {
                    if (cancelled) return;
                    setLoadedHotels(res.result);
                    setServerTotal(res.meta.total);
                    setServerTotalPages(Math.max(1, res.meta.totalPages));
                })
                .catch(() => {
                    if (!cancelled) {
                        setLoadedHotels([]);
                        setServerTotal(0);
                        setServerTotalPages(1);
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else {
            fetchAllMatching(scope)
                .then((hotels) => {
                    if (!cancelled) setLoadedHotels(hotels);
                })
                .catch(() => {
                    if (!cancelled) setLoadedHotels([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }
        return () => {
            cancelled = true;
        };
    }, [filters.provinceId, filters.wardId, query, usePagination, serverPage]);

    const filteredHotels = useMemo(() => {
        switch (viewMode.type) {
            case "bounds":
                return loadedHotels.filter((hotel) => {
                    const { lat, lng } = hotelLatLng(hotel);
                    return isInsideBounds(lat, lng, viewMode.bounds);
                });
            case "radius":
                return loadedHotels.filter((hotel) => {
                    const { lat, lng } = hotelLatLng(hotel);
                    return haversineDistanceKm(viewMode.lat, viewMode.lng, lat, lng) <= viewMode.radiusKm;
                });
            case "province":
            default:
                return loadedHotels;
        }
    }, [viewMode, loadedHotels]);

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
        loading,
        handleFilterSubmit,
        clearProvince,
        bookHotel,
        // Chỉ có ý nghĩa khi isRemotePaginated true — /hotels dùng để render
        // phân trang thật (gọi lại API mỗi lần đổi trang) thay vì tự cắt
        // mảng đã tải như trước.
        isRemotePaginated: usePagination,
        remotePage: serverPage,
        remoteTotalPages: serverTotalPages,
        remoteTotal: serverTotal,
        setRemotePage: setServerPage,
    };
}
