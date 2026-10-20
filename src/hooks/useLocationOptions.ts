"use client";

import { useEffect, useState } from "react";
import { getProvinceById, getWardById, type Province, type Ward } from "@/data/locations.data";
import { fetchProvinces, fetchWards } from "@/lib/hotels/locations";

// Lựa chọn tỉnh / xã cho dropdown, lấy từ API (xem lib/hotels/locations).
// Trong lúc chờ API: chỉ có đúng mục đang chọn (từ URL) để <select> không
// nhảy về "Tất cả" rồi mới nhảy lại. API lỗi -> giữ nguyên như vậy, không
// chặn tìm kiếm.

export function useProvinceOptions(selectedId: string | null): Province[] {
    const [list, setList] = useState<Province[] | null>(null);

    useEffect(() => {
        let alive = true;
        fetchProvinces()
            .then((result) => alive && setList(result))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    if (list) return list;
    const selected = getProvinceById(selectedId);
    return selected ? [selected] : [];
}

export function useWardOptions(provinceId: string | null, selectedId: string | null): Ward[] {
    // Gắn kết quả với provinceId đã gọi — đổi tỉnh thì kết quả cũ tự bị bỏ qua.
    const [loaded, setLoaded] = useState<{ provinceId: string; wards: Ward[] } | null>(null);

    useEffect(() => {
        if (!provinceId) return;
        let alive = true;
        fetchWards(provinceId)
            .then((wards) => alive && setLoaded({ provinceId, wards }))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [provinceId]);

    if (!provinceId) return [];
    if (loaded?.provinceId === provinceId) return loaded.wards;
    const selected = getWardById(selectedId);
    return selected && selected.provinceId === provinceId ? [selected] : [];
}
