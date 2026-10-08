"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuildingsIcon, CompassIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import SiteFooter from "@/components/SiteFooter/SiteFooter";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import HotelMiniCard from "@/components/HotelMiniCard/HotelMiniCard";
import TrustStrip from "@/components/home/TrustStrip/TrustStrip";
import PromoCarousel from "@/components/home/PromoCarousel/PromoCarousel";
import RegionDestinations from "@/components/home/RegionDestinations/RegionDestinations";
import FeaturedHotels from "@/components/home/FeaturedHotels/FeaturedHotels";
import TourShowcase from "@/components/home/TourShowcase/TourShowcase";
import GuestReviews from "@/components/home/GuestReviews/GuestReviews";
import MapBanner from "@/components/home/MapBanner/MapBanner";
import Faq from "@/components/home/Faq/Faq";
import NewsletterApp from "@/components/home/NewsletterApp/NewsletterApp";
import BookingJourney from "@/components/home/BookingJourney/BookingJourney";
import SectionHeading from "@/components/home/SectionHeading/SectionHeading";
import Reveal from "@/components/home/Reveal/Reveal";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { listHotels } from "@/lib/hotels/resources";
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

// Số điểm đến nổi bật (thẻ ảnh lớn).
const SECTION_SIZE = 6;
// Số khách sạn mỗi tab "Giá tốt"/"Cao cấp" ở mục Khách sạn nổi bật (2 hàng × 4 cột).
const FEATURED_SIZE = 8;
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
    // Cả trang khách sạn đã tải (cho chủ đề, tab theo tỉnh, review, banner bản đồ) + số liệu
    // cho dải tin cậy. null = chưa có (đang tải/API lỗi) — dải tin cậy hiện câu chữ thay số.
    const [allHotels, setAllHotels] = useState<Hotel[]>([]);
    const [totalHotels, setTotalHotels] = useState<number | null>(null);
    const [provinceCount, setProvinceCount] = useState<number | null>(null);
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

    const hotelCards = (hotels: { id: number; name: string; image: string; address: string; averagePrice: number | null }[]) => (
        <Reveal stagger className={styles.hotelGrid}>
            {hotels.map((hotel) => (
                <HotelMiniCard
                    key={hotel.id}
                    id={hotel.id}
                    name={hotel.name}
                    image={hotel.image}
                    address={hotel.address}
                    averagePrice={hotel.averagePrice}
                />
            ))}
        </Reveal>
    );

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

                    {destinations.length > 0 && (
                        <div className={styles.popular}>
                            <span>{t("home.popularLabel")}</span>
                            {destinations.slice(0, 5).map((destination) => (
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
                    <TrustStrip totalHotels={totalHotels} provinceCount={provinceCount} />
                </div>
            </section>

            {/* Nền các section xen kẽ tự động theo thứ tự thật (xem .sections trong CSS) — mục nào
                ẩn vì thiếu dữ liệu cũng không làm 2 section cạnh nhau trùng màu nền. */}
            <main className={styles.sections}>
                {recentlyViewed.length > 0 && (
                    <section className={styles.section}>
                        <SectionHeading
                            eyebrow={t("home.eyebrow.recent")}
                            title={t("home.recentlyViewedTitle")}
                            subtitle={t("home.recentlyViewedSubtitle")}
                        />
                        {hotelCards(recentlyViewed)}
                    </section>
                )}
                
                <section className={styles.section}>
                    <SectionHeading
                        eyebrow={t("home.eyebrow.promo")}
                        title={t("home.promo.title")}
                        subtitle={t("home.promo.subtitle")}
                    />
                    <PromoCarousel />
                </section>



                {destinations.length > 0 && (
                    <section className={styles.section}>
                        <SectionHeading
                            eyebrow={t("home.eyebrow.destinations")}
                            title={t("home.destinationsTitle")}
                            subtitle={t("home.destinationsSubtitle")}
                            action={{ href: "/map", label: t("home.viewAll") }}
                        />
                        <Reveal stagger className={styles.destGrid}>
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
                        </Reveal>
                    </section>
                )}

                <RegionDestinations hotels={allHotels} sectionClassName={styles.section} />

                {budgetHotels.length > 0 && (
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
                        />
                    </section>
                )}

                <section className={styles.section}>
                    <TourShowcase hotels={allHotels} />
                </section>

                <section className={styles.section}>
                    <SectionHeading
                        eyebrow={t("home.eyebrow.steps")}
                        title={t("home.steps.title")}
                        subtitle={t("home.steps.subtitle")}
                    />
                    <BookingJourney hotels={[...budgetHotels, ...luxuryHotels]} destinations={destinations} />
                </section>

                <GuestReviews hotels={[...luxuryHotels, ...budgetHotels]} sectionClassName={styles.section} />

                <section className={styles.section}>
                    <MapBanner hotels={budgetHotels} />
                </section>

                {moreDestinations.length > 0 && (
                    <section className={styles.section}>
                        <SectionHeading eyebrow={t("home.eyebrow.more")} title={t("home.moreDestinationsTitle")} />
                        <Reveal stagger className={styles.chipRow}>
                            {moreDestinations.map((destination) => (
                                <Link
                                    key={destination.id}
                                    href={`/map?province=${destination.id}`}
                                    className={styles.chip}
                                >
                                    {destination.name}
                                </Link>
                            ))}
                        </Reveal>
                    </section>
                )}

                <section className={styles.section}>
                    <SectionHeading
                        eyebrow={t("home.eyebrow.faq")}
                        title={t("home.faq.title")}
                        subtitle={t("home.faq.subtitle")}
                    />
                    <Faq />
                </section>

                <section className={styles.section}>
                    <NewsletterApp />
                </section>
            </main>

            <SiteFooter destinations={destinations} />
        </div>
    );
}
