"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminApiError } from "@/lib/admin/apiClient";
import type { Hotel } from "@/lib/admin/types";
import { getMyHotel } from "@/lib/partner/resources";

interface PartnerHotelValue {
    // null khi đang tải lần đầu hoặc lỗi.
    hotel: Hotel | null;
    error: string;
    // Tải lại sau khi sửa hotel/phòng — sidebar và các trang dùng chung 1 bản.
    reload: () => Promise<void>;
}

const PartnerHotelContext = createContext<PartnerHotelValue | null>(null);

// Hotel mà owner/staff đang quản lý (GET /hotels/me, kèm rooms) — tải 1 lần cho cả cổng.
export function PartnerHotelProvider({ children }: { children: ReactNode }) {
    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        try {
            setHotel(await getMyHotel());
            setError("");
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Không tải được khách sạn của bạn");
        }
    }, []);

    useEffect(() => {
        void reload(); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system
    }, [reload]);

    return <PartnerHotelContext.Provider value={{ hotel, error, reload }}>{children}</PartnerHotelContext.Provider>;
}

export function usePartnerHotel() {
    const ctx = useContext(PartnerHotelContext);
    if (!ctx) throw new Error("usePartnerHotel must be used within a PartnerHotelProvider");
    return ctx;
}
