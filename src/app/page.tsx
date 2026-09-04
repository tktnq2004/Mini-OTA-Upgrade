"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuildingsIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import SearchWidget from "@/components/SearchWidget/SearchWidget";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { listHotels } from "@/lib/hotels/client";
import { provinces } from "@/data/locations.data";
import { locationSearchParams, type SearchFilters } from "@/lib/searchFilters";
import styles from "./page.module.css";

interface Destination {
    id: string;
    name: string;
    hotelCount: number;
}

export default function Home() {
    const router = useRouter();
    const { t } = useLanguage();

    // Không có endpoint "đếm khách sạn theo tỉnh" — tải 1 trang khách sạn đủ
    // lớn (size cố định, KHÔNG phải "tải hết toàn quốc" vô hạn) rồi tự đếm ở
    // client cho mục hero này. Chấp nhận số liệu gần đúng nếu tổng khách sạn
    // vượt size — trang chủ chỉ cần top 6 tỉnh nổi bật, không cần chính xác
    // tuyệt đối như trang danh sách/bộ lọc thật.
    const [destinations, setDestinations] = useState<Destination[]>([]);

    useEffect(() => {
        listHotels({ page: 1, size: 100 })
            .then((res) => {
                const counts = new Map<string, number>();
                for (const hotel of res.result) {
                    const provinceId = hotel.ward.province.id;
                    counts.set(provinceId, (counts.get(provinceId) ?? 0) + 1);
                }
                const top = provinces
                    .map((province) => ({ ...province, hotelCount: counts.get(province.id) ?? 0 }))
                    .sort((a, b) => b.hotelCount - a.hotelCount)
                    .slice(0, 6);
                setDestinations(top);
            })
            .catch(() => setDestinations([]));
    }, []);

    const handleSearch = (filters: SearchFilters) => {
        const params = locationSearchParams(filters);
        router.push(`/map?${params.toString()}`);
    };

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

            <footer className={styles.footer}>
                <span>
                    © {new Date().getFullYear()} WenGo. {t("home.footerTagline")}
                </span>
            </footer>
        </div>
    );
}
