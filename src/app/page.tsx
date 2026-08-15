"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuildingsIcon } from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader";
import SearchWidget from "@/components/SearchWidget";
import ImageWithFallback from "@/components/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { hotels } from "@/data/hotels.data";
import { provinces, resolveHotelProvinceId } from "@/data/locations.data";
import { filtersToSearchParams, type SearchFilters } from "@/lib/searchFilters";
import styles from "./page.module.css";

export default function Home() {
    const router = useRouter();
    const { t } = useLanguage();

    const destinations = useMemo(() => {
        const counts = new Map<string, number>();
        for (const hotel of hotels) {
            const provinceId = resolveHotelProvinceId(hotel.cityId);
            if (!provinceId) continue;
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
