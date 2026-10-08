"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, CubeIcon, HandGrabbingIcon } from "@phosphor-icons/react";
import Reveal from "@/components/home/Reveal/Reveal";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { PANORAMA_TOURS } from "@/components/panorama/panoramaTours.data";
import type { Hotel } from "@/lib/hotels/types";
import styles from "./TourShowcase.module.css";

// three.js nặng — chỉ tải khi người dùng bấm "Xem 360°", không tải sẵn theo trang chủ.
const PanoramaCanvas = dynamic(() => import("@/components/panorama/PanoramaCanvas"), { ssr: false });

const PREVIEW_SCENE_ID = "main_room_101";

// Section giới thiệu tour 360° — điểm khác biệt của WenGo so với OTA thường.
export default function TourShowcase({ hotels }: { hotels: Hotel[] }) {
    const { t } = useLanguage();
    const [interactive, setInteractive] = useState(false);
    const viewerRef = useRef<HTMLDivElement>(null);

    const scene =
        PANORAMA_TOURS.flatMap((tour) => tour.scenes).find((s) => s.id === PREVIEW_SCENE_ID) ??
        PANORAMA_TOURS[0]?.scenes[0];

    // Canvas 360° dùng con lăn để zoom — chặn ở pha capture để lăn chuột trên khung vẫn cuộn trang.
    useEffect(() => {
        const el = viewerRef.current;
        if (!el || !interactive) return;
        const stop = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener("wheel", stop, { capture: true });
        return () => el.removeEventListener("wheel", stop, { capture: true });
    }, [interactive]);

    const tourHotels = PANORAMA_TOURS.map((tour) => ({
        id: tour.hotelId,
        name: hotels.find((h) => h.id === tour.hotelId)?.name,
    }));

    return (
        <Reveal className={styles.card}>
            <div className={styles.text}>
                <span className={styles.eyebrow}>
                    <CubeIcon size={14} weight="bold" />
                    {t("home.tour.eyebrow")}
                </span>
                <h2 className={styles.title}>{t("home.tour.title")}</h2>
                <p className={styles.lead}>{t("home.tour.text")}</p>
                <ul className={styles.points}>
                    {(["p1", "p2", "p3"] as const).map((key) => (
                        <li key={key}>
                            <CheckCircleIcon size={18} weight="fill" />
                            {t(`home.tour.${key}`)}
                        </li>
                    ))}
                </ul>
                <div className={styles.links}>
                    {tourHotels.map((hotel, i) => (
                        <Link
                            key={hotel.id}
                            href={`/hotel/${hotel.id}`}
                            className={i === 0 ? styles.primary : styles.ghost}
                        >
                            {hotel.name ?? t(`home.tour.hotel${i + 1}`)}
                            <ArrowRightIcon size={14} weight="bold" />
                        </Link>
                    ))}
                </div>
            </div>

            <div ref={viewerRef} className={styles.viewer}>
                {interactive && scene ? (
                    <>
                        <PanoramaCanvas imageUrl={scene.imageUrl} hotspots={[]} />
                        <span className={styles.dragHint}>
                            <HandGrabbingIcon size={14} weight="bold" />
                            {t("home.tour.dragHint")}
                        </span>
                    </>
                ) : (
                    <button type="button" className={styles.poster} onClick={() => setInteractive(true)}>
                        <span
                            className={styles.posterStrip}
                            style={{ backgroundImage: `url(${scene?.imageUrl ?? ""})` }}
                        />
                        <span className={styles.play}>
                            <CubeIcon size={18} weight="bold" />
                            {t("home.tour.start")}
                        </span>
                    </button>
                )}
            </div>
        </Reveal>
    );
}
