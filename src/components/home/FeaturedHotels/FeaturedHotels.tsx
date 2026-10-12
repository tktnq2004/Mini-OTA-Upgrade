"use client";

import { useState } from "react";
import HotelMiniCard from "@/components/HotelMiniCard/HotelMiniCard";
import HotelMiniCardSkeleton from "@/components/HotelMiniCard/HotelMiniCardSkeleton";
import Skeleton from "@/components/Skeleton/Skeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Hotel } from "@/lib/hotels/types";
import styles from "./FeaturedHotels.module.css";

interface FeaturedHotelsProps {
    budget: Hotel[];
    luxury: Hotel[];
    all: Hotel[];
    destinations: { id: string; name: string }[];
    /** Đang tải danh sách khách sạn — hiện tab + lưới thẻ xương giữ chỗ. */
    loading?: boolean;
}

// Số thẻ tối đa mỗi tab (2 hàng × 4 cột trên desktop).
const TAB_SIZE = 8;
// Số tab tỉnh/thành thêm sau 2 tab "Giá tốt"/"Cao cấp".
const PROVINCE_TABS = 3;
// Số thẻ xương khi đang tải (1 hàng trên desktop — đủ giữ chỗ mà không kéo dài trang).
const SKELETON_CARDS = 4;

/**
 * Gộp các dải "giá tốt"/"cao cấp" cũ thành 1 section có tab (kiểu "Homes guests love" của
 * Booking): Giá tốt · Cao cấp · vài tỉnh nhiều khách sạn nhất. Tab không có khách sạn thì ẩn.
 */
export default function FeaturedHotels({ budget, luxury, all, destinations, loading = false }: FeaturedHotelsProps) {
    const { t } = useLanguage();
    const [activeId, setActiveId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className={styles.wrap} aria-busy="true" aria-label={t("hotels.loading")}>
                <div className={styles.tabs}>
                    {[72, 64, 88].map((width) => (
                        <Skeleton key={width} width={width} height={34} radius="var(--radius-pill)" />
                    ))}
                </div>
                <div className={styles.skeletonGrid}>
                    {Array.from({ length: SKELETON_CARDS }, (_, i) => (
                        <HotelMiniCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    const tabs = [
        { id: "budget", label: t("home.featured.tabBudget"), hotels: budget },
        { id: "luxury", label: t("home.featured.tabLuxury"), hotels: luxury },
        ...destinations.slice(0, PROVINCE_TABS).map((d) => ({
            id: d.id,
            label: d.name,
            hotels: all.filter((h) => h.ward.province.id === d.id),
        })),
    ]
        .map((tab) => ({ ...tab, hotels: tab.hotels.slice(0, TAB_SIZE) }))
        .filter((tab) => tab.hotels.length > 0);

    const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
    if (!active) return null;

    return (
        <div className={styles.wrap}>
            <div className={styles.tabs} role="tablist" aria-label={t("home.featured.title")}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`featured-tab-${tab.id}`}
                        aria-selected={tab.id === active.id}
                        aria-controls="featured-panel"
                        className={styles.tab}
                        onClick={() => setActiveId(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* key đổi theo tab → lưới mount lại và chạy hiệu ứng hiện dần. */}
            <div
                key={active.id}
                id="featured-panel"
                role="tabpanel"
                aria-labelledby={`featured-tab-${active.id}`}
                className={styles.grid}
            >
                {active.hotels.map((hotel) => (
                    <HotelMiniCard
                        key={hotel.id}
                        id={hotel.id}
                        name={hotel.name}
                        image={hotel.image}
                        address={hotel.address}
                        averagePrice={hotel.averagePrice}
                    />
                ))}
            </div>
        </div>
    );
}
