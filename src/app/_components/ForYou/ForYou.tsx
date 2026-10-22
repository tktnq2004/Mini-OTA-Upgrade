"use client";

import { useMemo } from "react";
import HotelMiniCard from "@/components/HotelMiniCard/HotelMiniCard";
import Scroller from "../Scroller/Scroller";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Hotel } from "@/lib/hotels/types";
import type { RecentlyViewedHotel } from "@/lib/recentlyViewed";
import styles from "./ForYou.module.css";

const MAX_SUGGESTIONS = 8;

interface ForYouProps {
    recentlyViewed: RecentlyViewedHotel[];
    hotels: Hotel[];
}

/**
 * "Dành cho bạn" — khách sạn đã xem gần đây + gợi ý khách sạn KHÁC cùng tỉnh/thành với những nơi
 * khách đã xem (rẻ trước). Không cần API riêng: suy ra tỉnh từ danh sách khách sạn đã tải.
 */
export default function ForYou({ recentlyViewed, hotels }: ForYouProps) {
    const { t } = useLanguage();

    const suggestions = useMemo(() => {
        const viewedIds = new Set(recentlyViewed.map((h) => h.id));
        const provinceIds = new Set(hotels.filter((h) => viewedIds.has(h.id)).map((h) => h.ward.province.id));
        return hotels
            .filter((h) => provinceIds.has(h.ward.province.id) && !viewedIds.has(h.id))
            .sort((a, b) => (a.averagePrice ?? Infinity) - (b.averagePrice ?? Infinity))
            .slice(0, MAX_SUGGESTIONS);
    }, [recentlyViewed, hotels]);

    const row = (
        items: { id: number; name: string; image: string; address: string; averagePrice: number | null }[],
        label: string,
    ) => (
        <Scroller itemWidth="min(250px, 70vw)" ariaLabel={label}>
            {items.map((hotel) => (
                <HotelMiniCard
                    key={hotel.id}
                    id={hotel.id}
                    name={hotel.name}
                    image={hotel.image}
                    address={hotel.address}
                    averagePrice={hotel.averagePrice}
                />
            ))}
        </Scroller>
    );

    return (
        <div className={styles.wrap}>
            <h3 className={styles.subTitle}>{t("home.forYou.viewed")}</h3>
            {row(recentlyViewed, t("home.forYou.viewed"))}

            {suggestions.length > 0 && (
                <>
                    <h3 className={styles.subTitle}>{t("home.forYou.similar")}</h3>
                    {row(suggestions, t("home.forYou.similar"))}
                </>
            )}
        </div>
    );
}
