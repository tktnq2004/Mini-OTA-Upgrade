"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuildingsIcon, HeadsetIcon, LightningIcon, MapTrifoldIcon, TagIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import SiteFooter from "@/components/SiteFooter/SiteFooter";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import HotelMiniCard from "@/components/HotelMiniCard/HotelMiniCard";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { listHotels } from "@/lib/hotels/client";
import type { Hotel } from "@/lib/hotels/types";
import { loadRecentlyViewed, type RecentlyViewedHotel } from "@/lib/recentlyViewed";
import { provinces } from "@/data/locations.data";
import { locationSearchParams, type SearchFilters } from "@/lib/searchFilters";
import styles from "./page.module.css";

interface Destination {
    id: string;
    name: string;
    hotelCount: number;
}

// Số thẻ hiển thị ở mỗi dải khách sạn (giá tốt/cao cấp/đã xem gần đây) và số điểm đến nổi bật.
const SECTION_SIZE = 6;
// Số điểm đến phụ (chip) hiện thêm bên dưới, ngoài SECTION_SIZE điểm đến nổi bật đã có ảnh riêng.
const MORE_DESTINATIONS_SIZE = 12;

export default function Home() {
    const router = useRouter();
    const { t } = useLanguage();

    // Không có endpoint "đếm khách sạn theo tỉnh" hay "top khách sạn giá tốt/cao cấp" — tải 1
    // trang khách sạn đủ lớn (size cố định, KHÔNG phải "tải hết toàn quốc" vô hạn) rồi tự tính ở
    // client cho MỌI mục ở trang chủ (điểm đến nổi bật, giá tốt, cao cấp). Chấp nhận số liệu
    // gần đúng nếu tổng khách sạn vượt size — trang chủ chỉ cần vài mục nổi bật, không cần
    // chính xác tuyệt đối như trang danh sách/bộ lọc thật.
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [moreDestinations, setMoreDestinations] = useState<Destination[]>([]);
    const [budgetHotels, setBudgetHotels] = useState<Hotel[]>([]);
    const [luxuryHotels, setLuxuryHotels] = useState<Hotel[]>([]);
    // "Đã xem gần đây" đọc từ localStorage (ghi ở HotelDetail.tsx mỗi lần khách mở 1 khách sạn).
    const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedHotel[]>([]);

    useEffect(() => {
        listHotels({ page: 1, size: 100 })
            .then((res) => {
                const counts = new Map<string, number>();
                for (const hotel of res.result) {
                    const provinceId = hotel.ward.province.id;
                    counts.set(provinceId, (counts.get(provinceId) ?? 0) + 1);
                }
                const byCount = provinces
                    .map((province) => ({ ...province, hotelCount: counts.get(province.id) ?? 0 }))
                    .sort((a, b) => b.hotelCount - a.hotelCount);
                setDestinations(byCount.slice(0, SECTION_SIZE));
                // Vài điểm đến TIẾP THEO (ít khách sạn hơn top nổi bật, nhưng vẫn có ít nhất 1)
                // — hiện dạng danh sách gọn (chip) thay vì ảnh lớn, để khách vẫn duyệt được thêm
                // tỉnh/thành khác ngoài top 6 đã có ảnh riêng.
                setMoreDestinations(
                    byCount.slice(SECTION_SIZE, SECTION_SIZE + MORE_DESTINATIONS_SIZE).filter((p) => p.hotelCount > 0)
                );

                // averagePrice null = khách sạn chưa có room nào, chưa tính được giá — loại khỏi
                // cả 2 dải "giá tốt" và "cao cấp".
                const priced = res.result.filter(
                    (h): h is Hotel & { averagePrice: number } => h.averagePrice !== null
                );
                const cheapestFirst = [...priced].sort((a, b) => a.averagePrice - b.averagePrice);
                const budget = cheapestFirst.slice(0, SECTION_SIZE);
                // Bộ mẫu nhỏ (size=100) có thể không đủ khách sạn đã tính giá để tách hẳn 2 dải
                // riêng biệt — loại các khách sạn đã lọt vào dải "giá tốt" khỏi dải "cao cấp" để
                // không lặp lại đúng 1 khách sạn ở cả hai nơi.
                const budgetIds = new Set(budget.map((h) => h.id));
                const luxury = [...cheapestFirst].reverse().filter((h) => !budgetIds.has(h.id)).slice(0, SECTION_SIZE);
                setBudgetHotels(budget);
                setLuxuryHotels(luxury);
            })
            .catch(() => {
                setDestinations([]);
                setMoreDestinations([]);
                setBudgetHotels([]);
                setLuxuryHotels([]);
            });
    }, []);

    // localStorage — hệ thống ngoài React, chỉ đọc được ở client sau khi mount.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentlyViewed(loadRecentlyViewed());
    }, []);

    const handleSearch = (filters: SearchFilters) => {
        const params = locationSearchParams(filters);
        router.push(`/map?${params.toString()}`);
    };

    // 3 trong 4 mục dùng lại đúng câu chữ đã có ở màn hình đăng nhập/đăng ký (auth.perk*) —
    // cùng một lời hứa thương hiệu, khỏi dịch lại 2 lần dễ lệch nghĩa giữa 2 nơi.
    const valueProps = [
        { Icon: MapTrifoldIcon, text: t("home.perkSearch") },
        { Icon: LightningIcon, text: t("auth.perk1") },
        { Icon: TagIcon, text: t("auth.perk2") },
        { Icon: HeadsetIcon, text: t("auth.perk3") },
    ];

    return (
        <div className={styles.page}>
            <SiteHeader />

            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <h1 className={styles.headline}>{t("home.headline")}</h1>
                    <p className={styles.subtext}>{t("home.subtext")}</p>

                    <div className={styles.searchDock}>
                        <SearchWidget
                            variant="hero"
                            onSubmit={handleSearch}
                            submitLabel={t("search.submitBook")}
                        />
                    </div>
                </div>
            </section>

            {recentlyViewed.length > 0 && (
                <section className={styles.sectionLight}>
                    <div className={styles.sectionHeading}>
                        <h2>{t("home.recentlyViewedTitle")}</h2>
                        <p>{t("home.recentlyViewedSubtitle")}</p>
                    </div>
                    <div className={styles.hotelGrid}>
                        {recentlyViewed.map((hotel) => (
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
                </section>
            )}

            <section className={styles.destinations}>
                <div className={styles.sectionHeading}>
                    <h2>{t("home.destinationsTitle")}</h2>
                    <p>{t("home.destinationsSubtitle")}</p>
                </div>

                <div className={styles.destGrid}>
                    {destinations.map((destination) => (
                        <Link
                            key={destination.id}
                            href={`/map?province=${destination.id}`}
                            className={styles.destCard}
                        >
                            <ImageWithFallback
                                src={`https://picsum.photos/seed/wengo-dest-${destination.id}/640/480`}
                                alt={destination.name}
                                className={styles.destImg}
                                fallbackClassName={styles.destImgFallback}
                                fallback={<BuildingsIcon size={24} weight="light" />}
                            />
                            <div className={styles.destOverlay} />
                            <div className={styles.destInfo}>
                                <span className={styles.destName}>{destination.name}</span>
                                <span className={styles.destCount}>
                                    {t("home.hotelsCount", { count: destination.hotelCount })}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {budgetHotels.length > 0 && (
                <section className={styles.sectionLight}>
                    <div className={styles.sectionHeading}>
                        <h2>{t("home.budgetTitle")}</h2>
                        <p>{t("home.budgetSubtitle")}</p>
                    </div>
                    <div className={styles.hotelGrid}>
                        {budgetHotels.map((hotel) => (
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
                </section>
            )}

            {luxuryHotels.length > 0 && (
                <section className={styles.sectionAlt}>
                    <div className={styles.sectionHeading}>
                        <h2>{t("home.luxuryTitle")}</h2>
                        <p>{t("home.luxurySubtitle")}</p>
                    </div>
                    <div className={styles.hotelGrid}>
                        {luxuryHotels.map((hotel) => (
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
                </section>
            )}

            {moreDestinations.length > 0 && (
                <section className={styles.sectionLight}>
                    <div className={styles.sectionHeading}>
                        <h2>{t("home.moreDestinationsTitle")}</h2>
                    </div>
                    <div className={styles.chipRow}>
                        {moreDestinations.map((destination) => (
                            <Link key={destination.id} href={`/map?province=${destination.id}`} className={styles.chip}>
                                {destination.name}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <section className={styles.sectionAlt}>
                <div className={styles.sectionHeading}>
                    <h2>{t("home.whyUsTitle")}</h2>
                </div>
                <div className={styles.whyUsGrid}>
                    {valueProps.map(({ Icon, text }) => (
                        <div key={text} className={styles.whyUsItem}>
                            <Icon size={22} weight="light" />
                            <span>{text}</span>
                        </div>
                    ))}
                </div>
            </section>

            <SiteFooter destinations={destinations} />
        </div>
    );
}
