"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminApiError } from "@/lib/admin/apiClient";
import { listHotelBookings } from "@/lib/partner/resources";
import type { PartnerBooking } from "@/lib/partner/types";

// Toàn bộ đơn của hotel (backend chưa phân trang endpoint này) — lọc/phân trang ở FE.
export function usePartnerBookings() {
    const [bookings, setBookings] = useState<PartnerBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            setBookings(await listHotelBookings());
            setError("");
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Không tải được danh sách đặt phòng");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload(); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system
    }, [reload]);

    return { bookings, loading, error, reload };
}
