"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuildingsIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader";
import SearchWidget from "@/components/SearchWidget";
import ImageWithFallback from "@/components/ImageWithFallback";
import { hotels } from "@/data/hotels.data";
import { provinces, normalizeCityId } from "@/data/locations.data";
import { filtersToSearchParams, type SearchFilters } from "@/lib/searchFilters";
import styles from "./page.module.css";

export default function Home() {
    const router = useRouter();

    const destinations = useMemo(() => {
        const counts = new Map<number, number>();
        for (const hotel of hotels) {
            const provinceId = normalizeCityId(hotel.cityId);
            counts.set(provinceId, (counts.get(provinceId) ?? 0) + 1);
        }
        return provinces
            .map((province) => ({ ...province, hotelCount: counts.get(province.id) ?? 0 }))
            .sort((a, b) => b.hotelCount - a.hotelCount)
            .slice(0, 6);
    }, []);

    const handleSearch = (filters: SearchFilters) => {
        const params = filtersToSearchParams(filters);
        router.push(`/map?${params.toString()}`);
    };

    return (
        <div className={styles.page}>
            <SiteHeader />

            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <h1 className={styles.headline}>
                        Tìm nơi lưu trú hoàn hảo cho chuyến đi tiếp theo
                    </h1>
                    <p className={styles.subtext}>
                        So sánh hàng nghìn khách sạn khắp Việt Nam, chọn đúng khu vực và giữ phòng
                        chỉ trong vài phút.
                    </p>

                    <div className={styles.searchDock}>
                        <SearchWidget variant="hero" onSubmit={handleSearch} submitLabel="Đặt phòng ngay" />
                    </div>
                </div>
            </section>

            <section className={styles.destinations}>
                <div className={styles.sectionHeading}>
                    <h2>Điểm đến được đặt nhiều nhất</h2>
                    <p>Chọn một điểm đến để xem khách sạn nổi bật trên bản đồ</p>
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
                                    {destination.hotelCount} khách sạn
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <footer className={styles.footer}>
                <span>© {new Date().getFullYear()} WenGo. Mọi hành trình đều đáng nhớ.</span>
            </footer>
        </div>
    );
}
