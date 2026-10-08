"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BuildingsIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import Scroller from "@/components/home/Scroller/Scroller";
import SectionHeading from "@/components/home/SectionHeading/SectionHeading";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { provinces } from "@/data/locations.data";
import type { Hotel } from "@/lib/hotels/types";
import { formatCompactVnd } from "@/lib/format";
import styles from "./RegionDestinations.module.css";

// Chia vùng theo mã tỉnh của danh mục 34 tỉnh mới (mã tăng dần từ Bắc vào Nam):
// 01–37 Bắc (Hà Nội → Ninh Bình), 38–68 Trung & Tây Nguyên (Thanh Hoá → Lâm Đồng), 75+ Nam.
const REGIONS = [
    { key: "north", inRegion: (code: number) => code < 38 },
    { key: "central", inRegion: (code: number) => code >= 38 && code < 75 },
    { key: "south", inRegion: (code: number) => code >= 75 },
] as const;

// Số thẻ tỉnh tối đa mỗi vùng.
const PER_REGION = 10;

interface RegionDestinationsProps {
    hotels: Hotel[];
    /** Class nền/đệm của section (từ page) — component tự render <section> để tự ẩn khi rỗng. */
    sectionClassName: string;
}

/**
 * "Khám phá Việt Nam theo vùng miền" — tab Bắc · Trung · Nam, mỗi tab là băng chuyền thẻ tỉnh
 * (ảnh khách sạn thật, số khách sạn, giá từ). Chỉ hiện tỉnh có khách sạn; không có dữ liệu thì ẩn.
 */
export default function RegionDestinations({ hotels, sectionClassName }: RegionDestinationsProps) {
    const { t } = useLanguage();

    const regions = useMemo(() => {
        const byProvince = new Map<string, Hotel[]>();
        for (const hotel of hotels) {
            const id = hotel.ward.province.id;
            byProvince.set(id, [...(byProvince.get(id) ?? []), hotel]);
        }
        return REGIONS.map(({ key, inRegion }) => ({
            key,
            provinces: provinces
                .filter((p) => inRegion(Number(p.id)) && byProvince.has(p.id))
                .map((p) => {
                    const list = byProvince.get(p.id)!;
                    const prices = list.map((h) => h.averagePrice).filter((v): v is number => v !== null);
                    return {
                        id: p.id,
                        name: p.name,
                        count: list.length,
                        image: list.find((h) => h.image)?.image ?? "",
                        minPrice: prices.length ? Math.min(...prices) : null,
                    };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, PER_REGION),
        })).filter((region) => region.provinces.length > 0);
    }, [hotels]);

    const [activeKey, setActiveKey] = useState<string | null>(null);
    const active = regions.find((r) => r.key === activeKey) ?? regions[0];
    if (!active) return null;

    return (
        <section className={sectionClassName}>
            <SectionHeading
                eyebrow={t("home.regions.eyebrow")}
                title={t("home.regions.title")}
                subtitle={t("home.regions.subtitle")}
                action={{ href: "/map", label: t("home.viewAll") }}
            />

            <div className={styles.wrap}>
                <div className={styles.tabs} role="tablist" aria-label={t("home.regions.title")}>
                    {regions.map((region) => (
                        <button
                            key={region.key}
                            type="button"
                            role="tab"
                            id={`region-tab-${region.key}`}
                            aria-selected={region.key === active.key}
                            aria-controls="region-panel"
                            className={styles.tab}
                            onClick={() => setActiveKey(region.key)}
                        >
                            {t(`home.regions.${region.key}`)}
                            <span className={styles.tabCount}>{region.provinces.length}</span>
                        </button>
                    ))}
                </div>

                {/* key đổi theo tab → băng chuyền mount lại (về đầu) và các thẻ hiện dần. */}
                <div key={active.key} id="region-panel" role="tabpanel" aria-labelledby={`region-tab-${active.key}`}>
                    <Scroller itemWidth="min(220px, 62vw)" ariaLabel={t(`home.regions.${active.key}`)}>
                        {active.provinces.map((province, i) => (
                            <Link
                                key={province.id}
                                href={`/map?province=${province.id}`}
                                className={styles.card}
                                style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                            >
                                <span className={styles.thumb}>
                                    <ImageWithFallback
                                        src={province.image}
                                        alt={province.name}
                                        className={styles.img}
                                        fallbackClassName={styles.img}
                                        fallback={<BuildingsIcon size={24} weight="light" />}
                                    />
                                </span>
                                <span className={styles.body}>
                                    <strong className={styles.name}>{province.name}</strong>
                                    <span className={styles.meta}>
                                        {t("home.hotelsCount", { count: province.count })}
                                        {province.minPrice !== null && (
                                            <>
                                                {" · "}
                                                {t("home.regions.from", { price: formatCompactVnd(province.minPrice) })}
                                            </>
                                        )}
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </Scroller>
                </div>
            </div>
        </section>
    );
}
