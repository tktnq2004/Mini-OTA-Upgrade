"use client";

import { useEffect, useState } from "react";
import { listAmenities, listViews } from "@/lib/admin/resources";
import type { Amenity, View } from "@/lib/admin/types";

// Danh mục tiện nghi + hướng nhìn dùng chung mọi hotel (admin quản lý) — để chọn cho phòng.
export function useRoomCatalog() {
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [views, setViews] = useState<View[]>([]);

    useEffect(() => {
        Promise.all([listAmenities(), listViews()])
            .then(([a, v]) => {
                setAmenities(a);
                setViews(v);
            })
            .catch(() => undefined);
    }, []);

    return { amenities, views };
}
