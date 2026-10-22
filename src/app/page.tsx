"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuildingsIcon, CompassIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import SiteFooter from "@/components/SiteFooter/SiteFooter";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import TrustStrip from "./_components/TrustStrip/TrustStrip";
import PromoCarousel from "./_components/PromoCarousel/PromoCarousel";
import RegionDestinations from "./_components/RegionDestinations/RegionDestinations";
import WeekendGetaways from "./_components/WeekendGetaways/WeekendGetaways";
import ForYou from "./_components/ForYou/ForYou";
import FeaturedHotels from "./_components/FeaturedHotels/FeaturedHotels";
import TourShowcase from "./_components/TourShowcase/TourShowcase";
import GuestReviews from "./_components/GuestReviews/GuestReviews";
import MapBanner from "./_components/MapBanner/MapBanner";
import Faq from "./_components/Faq/Faq";
import NewsletterApp from "./_components/NewsletterApp/NewsletterApp";
import BookingJourney from "./_components/BookingJourney/BookingJourney";
import SectionHeading from "./_components/SectionHeading/SectionHeading";
import Reveal from "./_components/Reveal/Reveal";
import Skeleton from "@/components/Skeleton/Skeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { FEATURES } from "@/lib/features";
import { listHotels } from "@/lib/hotels/resources";
import type { Hotel } from "@/lib/hotels/types";
import { loadRecentlyViewed, type RecentlyViewedHotel } from "@/lib/recentlyViewed";
import { provinces } from "@/data/locations.data";
import { filtersToSearchParams, type SearchFilters } from "@/lib/searchFilters";
import styles from "./page.module.css";

interface Destination {
    id: string;
    name: string;
    hotelCount: number;
}

// Số điểm đến nổi bật (thẻ ảnh lớn).
const SECTION_SIZE = 6;
// Số chip "Phổ biến" dưới ô tìm kiếm + độ rộng chip xương khi đang tải (độ dài tên tỉnh khác nhau).
const POPULAR_CHIPS = 5;
const POPULAR_SKELETON_WIDTHS = [72, 88, 64, 96, 80];
// Số khách sạn mỗi tab "Giá tốt"/"Cao cấp" ở mục Khách sạn nổi bật (2 hàng × 4 cột).
const FEATURED_SIZE = 8;

export default function Home() {
    const router = useRouter();
    const { t } = useLanguage();

    // Không có endpoint "đếm khách sạn theo tỉnh" hay "top khách sạn giá tốt/cao cấp" — tải 1
    // trang khách sạn đủ lớn (size cố định, KHÔNG phải "tải hết toàn quốc" vô hạn) rồi tự tính ở
    // client cho MỌI mục ở trang chủ (điểm đến nổi bật, giá tốt, cao cấp). Chấp nhận số liệu
    // gần đúng nếu tổng khách sạn vượt size — trang chủ chỉ cần vài mục nổi bật, không cần
    // chính xác tuyệt đối như trang danh sách/bộ lọc thật.
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [budgetHotels, setBudgetHotels] = useState<Hotel[]>([]);
    const [luxuryHotels, setLuxuryHotels] = useState<Hotel[]>([]);
    // Cả trang khách sạn đã tải (cho chủ đề, tab theo tỉnh, review, banner bản đồ) + số liệu
    // cho dải tin cậy. null = chưa có (đang tải/API lỗi) — dải tin cậy hiện câu chữ thay số.
    const [allHotels, setAllHotels] = useState<Hotel[]>([]);
    const [totalHotels, setTotalHotels] = useState<number | null>(null);
    const [provinceCount, setProvinceCount] = useState<number | null>(null);
    // Đang tải → các section hiện khung xương giữ chỗ; tải xong mà rỗng/lỗi thì section tự ẩn.
    const [hotelsLoading, setHotelsLoading] = useState(true);
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
                setAllHotels(res.result);
                setTotalHotels(res.meta.total || null);
                setProvinceCount(counts.size || null);
                const byCount = provinces
                    .map((province) => ({ ...province, hotelCount: counts.get(province.id) ?? 0 }))
                    .sort((a, b) => b.hotelCount - a.hotelCount);
                setDestinations(byCount.slice(0, SECTION_SIZE).filter((p) => p.hotelCount > 0));

                // averagePrice null = khách sạn chưa có room nào, chưa tính được giá — loại khỏi
                // cả 2 dải "giá tốt" và "cao cấp".
                const priced = res.result.filter(
                    (h): h is Hotel & { averagePrice: number } => h.averagePrice !== null
                );
                const cheapestFirst = [...priced].sort((a, b) => a.averagePrice - b.averagePrice);
                const budget = cheapestFirst.slice(0, FEATURED_SIZE);
                // Bộ mẫu nhỏ (size=100) có thể không đủ khách sạn đã tính giá để tách hẳn 2 dải
                // riêng biệt — loại các khách sạn đã lọt vào dải "giá tốt" khỏi dải "cao cấp" để
                // không lặp lại đúng 1 khách sạn ở cả hai nơi.
                const budgetIds = new Set(budget.map((h) => h.id));
                const luxury = [...cheapestFirst].reverse().filter((h) => !budgetIds.has(h.id)).slice(0, FEATURED_SIZE);
                setBudgetHotels(budget);
                setLuxuryHotels(luxury);
            })
            .catch(() => {
                setDestinations([]);
                setBudgetHotels([]);
                setLuxuryHotels([]);
            })
            .finally(() => setHotelsLoading(false));
    }, []);

    // localStorage — hệ thống ngoài React, chỉ đọc được ở client sau khi mount.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentlyViewed(loadRecentlyViewed());
    }, []);

    // Mang theo cả ngày nhận/trả + số khách sang trang kết quả, không chỉ tỉnh/xã.
    const handleSearch = (filters: SearchFilters) => {
        const params = filtersToSearchParams(filters);
        router.push(`/map?${params.toString()}`);
    };

    // Ảnh đại diện điểm đến: ảnh khách sạn thật đầu tiên trong tỉnh; chưa có thì ảnh picsum cố định.
    const destinationImage = (provinceId: string) =>
        allHotels.find((h) => h.ward.province.id === provinceId && h.image)?.image ??
        `https://picsum.photos/seed/wengo-dest-${provinceId}/640/480`;

    return (
        <div className={styles.page}>
            <SiteHeader />

            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <span className={styles.heroEyebrow}>
                        <CompassIcon size={14} weight="bold" />
                        {t("home.heroEyebrow")}
                    </span>
                    <h1 className={styles.headline}>{t("home.headline")}</h1>
                    <p className={styles.subtext}>{t("home.subtext")}</p>

                    <div className={styles.searchDock}>
                        <SearchWidget
                            variant="hero"
                            onSubmit={handleSearch}
                            submitLabel={t("search.submitBook")}
                        />
                    </div>

                    {(hotelsLoading || destinations.length > 0) && (
                        <div className={styles.popular} aria-busy={hotelsLoading || undefined}>
                            <span>{t("home.popularLabel")}</span>
                            {hotelsLoading
                                ? POPULAR_SKELETON_WIDTHS.map((width, i) => (
                                      <Skeleton key={i} width={width} height={28} radius="var(--radius-pill)" />
                                  ))
                                : destinations.slice(0, POPULAR_CHIPS).map((destination) => (
                                      <Link
                                          key={destination.id}
                                          href={`/map?province=${destination.id}`}
                                          className={styles.popularChip}
                                      >
                                          {destination.name}
                                      </Link>
                                  ))}
                        </div>
                    )}
                </div>

                <div className={styles.trustDock}>
                    <TrustStrip totalHotels={totalHotels} provinceCount={provinceCount} loading={hotelsLoading} />
                </div>
            </section>

            {/* Nền các section xen kẽ tự động theo thứ tự thật (xem .sections trong CSS) — mục nào
                ẩn vì thiếu dữ liệu cũng không làm 2 section cạnh nhau trùng màu nền. */}
            <main className={styles.sections}>
                {recentlyViewed.length > 0 && (
                    <section className={styles.section}>
                        <SectionHeading
                            eyebrow={t("home.eyebrow.recent")}
                            title={t("home.forYou.title")}
                            subtitle={t("home.forYou.subtitle")}
                        />
                        <ForYou recentlyViewed={recentlyViewed} hotels={allHotels} />
                    </section>
                )}

                {(hotelsLoading || budgetHotels.length > 0) && (
                    <section className={styles.section}>
                        <SectionHeading
                            eyebrow={t("home.eyebrow.featured")}
                            title={t("home.featured.title")}
                            subtitle={t("home.featured.subtitle")}
                            action={{ href: "/hotels", label: t("home.viewAll") }}
                        />
                        <FeaturedHotels
                            budget={budgetHotels}
                            luxury={luxuryHotels}
                            all={allHotels}
                            destinations={destinations}
                            loading={hotelsLoading}
                        />
                    </section>
                )}

                {FEATURES.promoCodes && (
                    <section className={styles.section}>
                        <SectionHeading
                            eyebrow={t("home.eyebrow.promo")}
                            title={t("home.promo.title")}
                            subtitle={t("home.promo.subtitle")}
                        />
                        <PromoCarousel />
                    </section>
                )}

                {(hotelsLoading || destinations.length > 0) && (
                    <section className={styles.section}>
                        <SectionHeading
                            eyebrow={t("home.eyebrow.destinations")}
                            title={t("home.destinationsTitle")}
                            subtitle={t("home.destinationsSubtitle")}
                            action={{ href: "/map", label: t("home.viewAll") }}
                        />
                        {hotelsLoading ? (
                            <div className={styles.destGrid} aria-busy="true" aria-label={t("hotels.loading")}>
                                {Array.from({ length: SECTION_SIZE }, (_, i) => (
                                    <div key={i} className={styles.destSkeleton} aria-hidden>
                                        <Skeleton fill />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Reveal stagger className={styles.destGrid}>
                                {destinations.map((destination) => (
                                    <Link
                                        key={destination.id}
                                        href={`/map?province=${destination.id}`}
                                        className={styles.destCard}
                                    >
                                        <ImageWithFallback
                                            src={destinationImage(destination.id)}
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
                            </Reveal>
                        )}
                    </section>
                )}

                <WeekendGetaways
                    hotels={allHotels}
                    destinations={destinations}
                    loading={hotelsLoading}
                    sectionClassName={styles.section}
                    heading={
                        <SectionHeading
                            eyebrow={t("home.eyebrow.weekend")}
                            title={t("home.weekend.title")}
                            subtitle={t("home.weekend.subtitle")}
                        />
                    }
                />

                <RegionDestinations hotels={allHotels} loading={hotelsLoading} sectionClassName={styles.section} />

                <section className={styles.section}>
                    <TourShowcase hotels={allHotels} />
                </section>

                <GuestReviews
                    hotels={[...luxuryHotels, ...budgetHotels]}
                    loading={hotelsLoading}
                    sectionClassName={styles.section}
                />

                <section className={styles.section}>
                    <SectionHeading
                        eyebrow={t("home.eyebrow.steps")}
                        title={t("home.steps.title")}
                        subtitle={t("home.steps.subtitle")}
                    />
                    <BookingJourney />
                </section>

                <section className={styles.section}>
                    <MapBanner hotels={budgetHotels} />
                </section>

                <section className={styles.section}>
                    <SectionHeading
                        eyebrow={t("home.eyebrow.faq")}
                        title={t("home.faq.title")}
                        subtitle={t("home.faq.subtitle")}
                    />
                    <Faq />
                </section>

                {FEATURES.newsletterAndApp && (
                    <section className={styles.section}>
                        <NewsletterApp />
                    </section>
                )}
            </main>

            <SiteFooter destinations={destinations} />
        </div>
    );
}
