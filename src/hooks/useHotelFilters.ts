"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import { listHotels, listNearbyHotels } from "@/lib/hotels/resources";
import type { Hotel } from "@/lib/hotels/types";
import { getProvinceById } from "@/data/locations.data";
import {
    filtersToSearchParams,
    locationSearchParams,
    parseFilters,
    type SearchFilters,
} from "@/lib/searchFilters";
import { isInsideBounds, type BoundsBox } from "@/lib/geo";

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

// Đang "Tìm quanh đây": phạm vi tải là các hotel cách (lat, lng) không quá
// radiusKm (backend tự lọc, xem listNearbyHotels), thay cho phạm vi tỉnh/xã.
// Giữ nguyên khi người dùng kéo map — chỉ bị xoá khi tìm theo tỉnh/xã lại.
export interface NearbySearch {
    lat: number;
    lng: number;
    radiusKm: number;
}

interface FetchScopeParams {
    provinceId?: string | null;
    wardId?: string | null;
    query?: string;
}

// Tải HẾT hotel khớp phạm vi (tỉnh/xã/tên) — dùng khi cần thấy toàn bộ cùng
// lúc để lọc/hiển thị tiếp ở client: bản đồ (vẽ hết marker, lọc khung nhìn
// khi kéo), và /hotels khi đã chọn tỉnh. Dò tổng thật qua meta.total thay vì
// tin vào 1 cỡ cố định — xem PROBE_SIZE.
async function fetchAllMatching(params: FetchScopeParams): Promise<Hotel[]> {
    const first = await listHotels({ ...params, page: 1, size: PROBE_SIZE });
    if (first.meta.total <= first.result.length) return first.result;
    const full = await listHotels({ ...params, page: 1, size: first.meta.total });
    return full.result;
}

export interface UseHotelFiltersOptions {
    // Cho phép /hotels chuyển sang phân trang SERVER thật (gọi lại API mỗi
    // lần đổi trang, không tải hết) khi đang duyệt TOÀN QUỐC (không tỉnh,
    // không tìm quanh đây) — số hotel lớn, tải hết 1 lần sẽ nặng.
    // /map luôn cần tải hết (vẽ marker phân bố cả nước) nên KHÔNG bật cờ
    // này — mặc định false.
    serverPaginate?: boolean;
    // Tìm theo tên — chuyển thẳng xuống backend (turkraft `name~'*...*'`)
    // thay vì lọc lại trong tập đã tải ở client, để tìm đúng trên TOÀN BỘ
    // hotel khớp phạm vi hiện tại, không chỉ trong những gì đã tải sẵn. Nên
    // debounce giá trị này trước khi truyền vào (tránh gọi API mỗi phím gõ).
    query?: string;
}

// Quản lý phạm vi tải hotel và cách lọc hiển thị, dùng chung cho Map và Hotels.
// Có 2 kiểu tìm, loại trừ nhau:
// - Theo tỉnh/xã (đồng bộ 2 chiều với URL): tải hotel của tỉnh/xã đó.
// - "Tìm quanh đây" (`nearby`): gửi toạ độ GPS lên backend, chỉ nhận về các
//   hotel trong bán kính.
// Sau khi tải, kéo/zoom map chỉ lọc lại trên tập đã có (xem `bounds`), không
// gọi API — cho tới khi người dùng tìm theo kiểu kia.
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
    // Khung nhìn map để lọc hiển thị — null = hiện hết những gì đã tải; có
    // giá trị = chỉ hiện hotel nằm trong khung (người dùng tự kéo/zoom). Chỉ
    // ảnh hưởng hiển thị, không ảnh hưởng việc tải.
    const [bounds, setBounds] = useState<BoundsBox | null>(null);
    const [nearby, setNearby] = useState<NearbySearch | null>(null);

    const paramsKey = searchParams.toString();
    const [syncedParamsKey, setSyncedParamsKey] = useState(paramsKey);
    if (paramsKey !== syncedParamsKey) {
        setSyncedParamsKey(paramsKey);
        // URL của trang chỉ mang tỉnh/xã (xem locationSearchParams) — ngày
        // nhận/trả và số khách không nằm trong URL nữa nên KHÔNG ghi đè lại
        // từ đây, chỉ đồng bộ 2 trường địa điểm, giữ nguyên phần còn lại
        // người dùng đang chỉnh trên form. URL đổi = người dùng chọn lại địa
        // điểm (hoặc back/forward) nên thoát luôn "Tìm quanh đây" —
        // startNearbySearch không ghi URL nên không tự kích hoạt nhánh này.
        const parsed = parseFilters(searchParams);
        setFilters((current) => ({ ...current, provinceId: parsed.provinceId, wardId: parsed.wardId }));
        setBounds(null);
        setNearby(null);
    }

    const filtersRef = useRef(filters);
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const selectedProvince = getProvinceById(filters.provinceId);

    // Duyệt TOÀN QUỐC (không tỉnh, không tìm quanh đây) là trường hợp DUY
    // NHẤT phân trang server thật. "Tìm quanh đây" cũng có provinceId null
    // nhưng endpoint nearby trả về 1 danh sách (đã giới hạn bán kính), không
    // phân trang.
    const usePagination = Boolean(options.serverPaginate) && !filters.provinceId && !nearby;

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

    // Tập khách sạn đã tải cho đúng phạm vi hiện tại — fetch lại CHỈ khi
    // phạm vi đổi: tỉnh/xã/tên, bật/bấm lại "Tìm quanh đây" (nearby là object
    // mới mỗi lần bấm), hoặc đổi trang ở chế độ phân trang server. bounds
    // KHÔNG nằm trong dependency — kéo/zoom map chỉ lọc lại ở filteredHotels.
    const [loadedHotels, setLoadedHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    // Lỗi tải (mạng/backend) — tách riêng với "không có kết quả" để trang báo đúng lỗi kèm nút
    // thử lại, thay vì hiện "0 khách sạn" như thể bộ lọc không khớp. Tăng reloadKey = tải lại.
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- tải khách sạn từ API theo phạm vi lọc hiện tại, một external system
        setLoading(true);
        setLoadError(false);

        const scope: FetchScopeParams = { provinceId: filters.provinceId, wardId: filters.wardId, query };

        if (nearby) {
            listNearbyHotels({ ...nearby, query })
                .then((hotels) => {
                    if (!cancelled) setLoadedHotels(hotels);
                })
                .catch(() => {
                    if (!cancelled) {
                        setLoadedHotels([]);
                        setLoadError(true);
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else if (usePagination) {
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
                        setLoadError(true);
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
                    if (!cancelled) {
                        setLoadedHotels([]);
                        setLoadError(true);
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }
        return () => {
            cancelled = true;
        };
    }, [filters.provinceId, filters.wardId, query, nearby, usePagination, serverPage, reloadKey]);

    const filteredHotels = useMemo(() => {
        if (!bounds) return loadedHotels;
        return loadedHotels.filter((hotel) =>
            isInsideBounds(Number(hotel.latitude), Number(hotel.longitude), bounds)
        );
    }, [bounds, loadedHotels]);

    const handleFilterSubmit = (next: SearchFilters) => {
        setFilters(next);
        setBounds(null);
        setNearby(null);
        // Chỉ tỉnh/xã lên URL — ngày nhận/trả, số khách vẫn được giữ trong
        // filters (React state) để dùng lúc bấm "đặt phòng", không phải là
        // tham số tìm kiếm nên không ghi vào query string.
        const params = locationSearchParams(next);
        router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    };

    const clearProvince = () => {
        handleFilterSubmit({ ...filters, provinceId: null, wardId: null });
    };

    // "Tìm quanh đây" thay hẳn kiểu tìm theo tỉnh/xã: xoá provinceId/wardId để
    // form không còn hiện tỉnh cũ, và để sau này tìm theo tỉnh lại thì phải
    // chọn tỉnh mới (không "quay về" tỉnh cũ ngầm). Không ghi URL — xem nhánh
    // đồng bộ paramsKey ở trên.
    const startNearbySearch = (lat: number, lng: number, radiusKm: number) => {
        setFilters((current) => ({ ...current, provinceId: null, wardId: null }));
        setBounds(null);
        setNearby({ lat, lng, radiusKm });
    };

    const bookHotel = (hotelId: number) => {
        const params = filtersToSearchParams(filtersRef.current);
        router.push(`/hotel/${hotelId}?${params.toString()}`);
    };

    return {
        filters,
        bounds,
        setBounds,
        selectedProvince,
        filteredHotels,
        loading,
        loadError,
        retry: () => setReloadKey((key) => key + 1),
        handleFilterSubmit,
        clearProvince,
        nearby,
        startNearbySearch,
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
