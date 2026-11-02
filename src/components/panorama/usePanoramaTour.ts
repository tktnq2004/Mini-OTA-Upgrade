"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { toPanoramaTour } from "@/lib/tour/toPanoramaTour";
import type { Tour } from "@/lib/tour/types";
import { getPanoramaTourForHotel } from "./panoramaTours.data";

// Tour cho nút "Xem Panorama 360°" ở trang khách sạn/phòng: ưu tiên tour thật
// (ảnh + hotspot gắn ở /admin/tour/{id}); khách sạn chưa có thì rơi về tour mẫu
// của 2 khách sạn demo; không có nữa thì panoramaTour = undefined và nút bị ẩn.
export function usePanoramaTour(hotelId: number, tour: Tour | null) {
    const { language } = useLanguage();

    return useMemo(() => {
        if (!tour?.scenes.length) {
            return { panoramaTour: getPanoramaTourForHotel(hotelId), initialSceneId: undefined };
        }
        return { panoramaTour: toPanoramaTour(tour, language), initialSceneId: tour.startSceneId ?? undefined };
    }, [hotelId, tour, language]);
}
