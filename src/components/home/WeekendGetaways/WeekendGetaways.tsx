"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, BuildingsIcon, CalendarBlankIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import Reveal from "@/components/home/Reveal/Reveal";
import Skeleton from "@/components/Skeleton/Skeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Hotel } from "@/lib/hotels/types";
import { formatDateVn } from "@/lib/format";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { addDaysIso, filtersToSearchParams, todayIso } from "@/lib/searchFilters";
import styles from "./WeekendGetaways.module.css";

// Mỗi chuyến cuối tuần: nhận phòng thứ 6, trả phòng chủ nhật (2 đêm).
const NIGHTS = 2;
const GUESTS = 2;
const MAX_CARDS = 4;

const dayOfWeek = (iso: string) => new Date(`${iso}T00:00:00`).getDay(); // 0 = CN … 5 = T6

// Thứ 6 gần nhất còn đi kịp: hôm nay là T6 thì lấy hôm nay; T7/CN thì sang T6 tuần sau.
function upcomingFriday(fromIso: string): string {
    const diff = (5 - dayOfWeek(fromIso) + 7) % 7;
    return addDaysIso(fromIso, diff);
}

// Thứ 6 đầu tiên của tháng sau.
function firstFridayOfNextMonth(fromIso: string): string {
    const [y, m] = fromIso.split("-").map(Number);
    const firstOfNext = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return upcomingFriday(firstOfNext);
}

interface WeekendGetawaysProps {
    hotels: Hotel[];
    destinations: { id: string; name: string; hotelCount: number }[];
    /** Class nền/đệm của section (từ page) — component tự render <section> để tự ẩn khi rỗng. */
    sectionClassName: string;
    heading: React.ReactNode;
    /** Đang tải danh sách khách sạn — giữ chỗ bằng thẻ xương thay vì ẩn rồi bật ra. */
    loading?: boolean;
}

/**
 * "Cuối tuần này đi đâu?" — chọn mốc (cuối tuần này / tuần sau / tháng sau), mỗi thẻ điểm đến
 * mở thẳng danh sách khách sạn của tỉnh đó với ngày nhận/trả + số khách đã điền sẵn.
 */
export default function WeekendGetaways({
    hotels,
    destinations,
    sectionClassName,
    heading,
    loading = false,
}: WeekendGetawaysProps) {
    const { t, language } = useLanguage();
    const { formatPrice, formatCompactPrice } = useCurrency();

    const presets = useMemo(() => {
        const thisFriday = upcomingFriday(todayIso());
        return [
            { key: "thisWeekend", checkin: thisFriday },
            { key: "nextWeekend", checkin: addDaysIso(thisFriday, 7) },
            { key: "nextMonth", checkin: firstFridayOfNextMonth(todayIso()) },
        ].map((preset) => ({ ...preset, checkout: addDaysIso(preset.checkin, NIGHTS) }));
    }, []);

    const cards = useMemo(
        () =>
            destinations
                .filter((d) => d.hotelCount > 0)
                .slice(0, MAX_CARDS)
                .map((d) => {
                    const inProvince = hotels.filter((h) => h.ward.province.id === d.id);
                    const withImage = inProvince.filter((h) => h.image);
                    const prices = inProvince.map((h) => h.averagePrice).filter((v): v is number => v !== null);
                    return {
                        ...d,
                        // Ưu tiên ảnh khách sạn thứ 2 trong tỉnh — khối "Điểm đến" phía trên đã dùng ảnh thứ 1.
                        image: (withImage[1] ?? withImage[0])?.image ?? "",
                        minPrice: prices.length ? Math.round(Math.min(...prices)) : null,
                    };
                }),
        [hotels, destinations],
    );

    const [activeKey, setActiveKey] = useState(presets[0].key);
    const active = presets.find((p) => p.key === activeKey) ?? presets[0];
    if (!loading && cards.length === 0) return null;

    // "17/10 – 19/10" — chỉ ngày/tháng cho gọn.
    const shortRange = (checkin: string, checkout: string) =>
        `${formatDateVn(checkin, language).slice(0, 5)} – ${formatDateVn(checkout, language).slice(0, 5)}`;

    return (
        <section className={sectionClassName}>
            {heading}
            <div className={styles.wrap}>
                <div className={styles.presets} role="tablist" aria-label={t("home.weekend.title")}>
                    {presets.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            role="tab"
                            aria-selected={preset.key === active.key}
                            className={styles.preset}
                            onClick={() => setActiveKey(preset.key)}
                        >
                            <strong>{t(`home.weekend.${preset.key}`)}</strong>
                            <span>{shortRange(preset.checkin, preset.checkout)}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.grid} aria-busy="true" aria-label={t("hotels.loading")}>
                        {Array.from({ length: MAX_CARDS }, (_, i) => (
                            <div key={i} className={styles.card} aria-hidden>
                                <span className={styles.thumb}>
                                    <Skeleton fill />
                                </span>
                                <span className={styles.body}>
                                    <Skeleton width="55%" height={17} />
                                    <Skeleton width="35%" height={12} />
                                    <span className={styles.price}>
                                        <Skeleton width="60%" height={15} />
                                    </span>
                                    <span className={styles.cta}>
                                        <Skeleton width={110} height={13} />
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Reveal stagger className={styles.grid} key={active.key}>
                        {cards.map((card) => {
                            const params = filtersToSearchParams({
                                provinceId: card.id,
                                wardId: null,
                                checkin: active.checkin,
                                checkout: active.checkout,
                                guests: GUESTS,
                            });
                            return (
                                <Link key={card.id} href={`/hotels?${params.toString()}`} className={styles.card}>
                                    <span className={styles.thumb}>
                                        <ImageWithFallback
                                            src={card.image}
                                            alt={card.name}
                                            className={styles.img}
                                            fallbackClassName={styles.img}
                                            fallback={<BuildingsIcon size={24} weight="light" />}
                                        />
                                        <span className={styles.dates}>
                                            <CalendarBlankIcon size={12} weight="bold" />
                                            {t("home.weekend.nights", { nights: NIGHTS })}
                                        </span>
                                    </span>
                                    <span className={styles.body}>
                                        <strong className={styles.name}>{card.name}</strong>
                                        <span className={styles.meta}>
                                            {t("home.hotelsCount", { count: card.hotelCount })}
                                        </span>
                                        {card.minPrice !== null && (
                                            <span className={styles.price}>
                                                {t("home.weekend.from")}{" "}
                                                <strong>{formatCompactPrice(card.minPrice)}</strong>
                                                {t("room.perNight")}
                                                <span className={styles.total}>
                                                    {t("home.weekend.total", {
                                                        nights: NIGHTS,
                                                        total: formatPrice(card.minPrice * NIGHTS),
                                                    })}
                                                </span>
                                            </span>
                                        )}
                                        <span className={styles.cta}>
                                            {t("home.weekend.cta")}
                                            <ArrowRightIcon size={13} weight="bold" />
                                        </span>
                                    </span>
                                </Link>
                            );
                        })}
                    </Reveal>
                )}
            </div>
        </section>
    );
}
