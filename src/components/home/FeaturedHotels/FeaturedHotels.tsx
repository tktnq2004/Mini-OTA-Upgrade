"use client";

import { useState } from "react";
import HotelMiniCard from "@/components/HotelMiniCard/HotelMiniCard";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Hotel } from "@/lib/hotels/types";
import styles from "./FeaturedHotels.module.css";

interface FeaturedHotelsProps {
    budget: Hotel[];
    luxury: Hotel[];
    all: Hotel[];
    destinations: { id: string; name: string }[];
}

// Số thẻ tối đa mỗi tab (2 hàng × 4 cột trên desktop).
const TAB_SIZE = 8;
// Số tab tỉnh/thành thêm sau 2 tab "Giá tốt"/"Cao cấp".
const PROVINCE_TABS = 3;

/**
 * Gộp các dải "giá tốt"/"cao cấp" cũ thành 1 section có tab (kiểu "Homes guests love" của
 * Booking): Giá tốt · Cao cấp · vài tỉnh nhiều khách sạn nhất. Tab không có khách sạn thì ẩn.
 */
export default function FeaturedHotels({ budget, luxury, all, destinations }: FeaturedHotelsProps) {
    const { t } = useLanguage();

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

    const [activeId, setActiveId] = useState<string | null>(null);
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
