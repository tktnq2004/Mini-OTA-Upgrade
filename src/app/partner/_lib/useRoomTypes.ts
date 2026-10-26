"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminApiError } from "@/lib/admin/apiClient";
import { listRoomTypes } from "@/lib/admin/resources";
import type { RoomType } from "@/lib/admin/types";

// Loại phòng của hotel đang quản lý (kể cả loại chưa có phòng nào — hotel.rooms không đủ).
// null khi đang tải lần đầu.
export function useRoomTypes(hotelId: number | undefined) {
    const [roomTypes, setRoomTypes] = useState<RoomType[] | null>(null);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        if (hotelId === undefined) return;
        try {
            setRoomTypes(await listRoomTypes(hotelId));
            setError("");
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Không tải được loại phòng");
        }
    }, [hotelId]);

    useEffect(() => {
        void reload(); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system
    }, [reload]);

    return { roomTypes, error, reload };
}
