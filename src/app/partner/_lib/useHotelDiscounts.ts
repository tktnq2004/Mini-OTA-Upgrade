"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { listDiscounts } from "@/lib/admin/resources";
import type { Discount } from "@/lib/admin/types";

// Đủ cho mọi khuyến mãi của 1 hotel — backend tự giới hạn về hotel người gọi.
const MAX_DISCOUNTS = 100;

// Khuyến mãi của hotel để hiện cạnh phòng (danh sách + trang sửa phòng). Tài khoản không có
// DISCOUNT_READ (vd. staff) nhận mảng rỗng, không gọi API.
export function useHotelDiscounts() {
    const { ready, hasPermission } = useAdminAccess();
    const canRead = ready && hasPermission("DISCOUNT_READ");
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    useEffect(() => {
        if (!canRead) return;
        listDiscounts({ page: 1, size: MAX_DISCOUNTS })
            .then((res) => setDiscounts(res.result))
            .catch(() => setDiscounts([]));
    }, [canRead]);

    return { discounts, canRead };
}
