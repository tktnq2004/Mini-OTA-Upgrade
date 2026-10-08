"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useReducedMotion } from "@/components/panorama/useReducedMotion";
import type { Hotel } from "@/lib/hotels/types";
import { formatDateVn } from "@/lib/format";
import { addDaysIso, todayIso } from "@/lib/searchFilters";
import { pickDestinations, pickHotels } from "./journeyData";
import { useActiveStep, useMediaQuery } from "./useActiveStep";
import SearchScreen from "./screens/SearchScreen";
import MapScreen from "./screens/MapScreen";
import PaymentScreen from "./screens/PaymentScreen";
import CheckInScreen from "./screens/CheckInScreen";
import styles from "./BookingJourney.module.css";

const STEPS = [
    { key: "search" },
    { key: "map", link: "/map" },
    { key: "pay" },
    { key: "checkin", link: "/hotels" },
] as const;

// Ngày minh hoạ trong các màn: nhận phòng sau 1 tuần, ở 2 đêm.
const NIGHTS = 2;

interface BookingJourneyProps {
    hotels: Hotel[];
    destinations: { id: string; name: string; hotelCount: number }[];
}

/**
 * "Đặt phòng chỉ với 4 bước" — desktop: cột trái là các bước, cột phải là khung UI dính (sticky)
 * đổi màn theo bước đang ở giữa màn hình. Mobile: mỗi bước kèm màn của nó ngay bên dưới.
 * Mọi màn dựng bằng đúng ngôn ngữ giao diện của site (token màu, viền, bo góc) + dữ liệu thật.
 */
export default function BookingJourney({ hotels, destinations }: BookingJourneyProps) {
    const { t, language } = useLanguage();
    const reducedMotion = useReducedMotion();
    const isDesktop = useMediaQuery("(min-width: 900px)");
    const { active, seen, register } = useActiveStep(
        STEPS.length,
        isDesktop ? "-45% 0px -45% 0px" : "-30% 0px -30% 0px"
    );

    const { list: journeyHotels } = useMemo(() => pickHotels(hotels), [hotels]);
    const journeyDestinations = useMemo(() => pickDestinations(destinations), [destinations]);

    const checkinIso = addDaysIso(todayIso(), 7);
    const checkoutIso = addDaysIso(checkinIso, NIGHTS);
    const checkin = formatDateVn(checkinIso, language);
    const checkout = formatDateVn(checkoutIso, language);
    const hotel = journeyHotels[0];

    const screens: ReactNode[] = [
        <SearchScreen
            key="search"
            destinations={journeyDestinations}
            dateRange={`${checkin.slice(0, 5)} – ${checkout.slice(0, 5)}`}
        />,
        <MapScreen key="map" hotels={journeyHotels} />,
        <PaymentScreen key="pay" hotel={hotel} checkin={checkin} checkout={checkout} nights={NIGHTS} />,
        <CheckInScreen key="checkin" hotel={hotel} checkin={checkin} loadPanorama={seen >= 2} />,
    ];

    const goToSearch = () => {
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
        window.setTimeout(() => document.getElementById("sw-province")?.focus({ preventScroll: true }), 500);
    };

    const stepText = (key: string, index: number, link?: string) => (
        <>
            <span className={styles.stepNum}>{index + 1}</span>
            <div className={styles.stepText}>
                <h3>{t(`home.steps.${key}.title`)}</h3>
                <p>{t(`home.steps.${key}.text`)}</p>
                {link && (
                    <Link href={link} className={styles.stepLink}>
                        {t(`home.steps.${key}.link`)}
                        <ArrowRightIcon size={13} weight="bold" />
                    </Link>
                )}
            </div>
        </>
    );

    const stageBar = (index: number) => (
        <div className={styles.stageBar}>
            <span className={styles.chrome} aria-hidden>
                <i />
                <i />
                <i />
            </span>
            <span className={styles.stageLabel}>
                {t("home.steps.stepOf", { n: index + 1, total: STEPS.length })} ·{" "}
                {t(`home.steps.${STEPS[index].key}.title`)}
            </span>
            <span className={styles.progress} aria-hidden>
                {STEPS.map((step, i) => (
                    <span key={step.key} data-on={i <= index} />
                ))}
            </span>
        </div>
    );

    // Màn đang hiện: bước đang xem (trước khi cuộn tới bước 1 thì hiện sẵn màn 1, chưa chạy hiệu ứng).
    const shown = Math.max(active, 0);

    return (
        <div className={styles.journey}>
            {isDesktop ? (
                <div className={styles.grid}>
                    <ol className={styles.steps}>
                        {STEPS.map((step, i) => (
                            <li key={step.key} ref={register(i)} className={styles.step} data-active={i === shown}>
                                {stepText(step.key, i, "link" in step ? step.link : undefined)}
                            </li>
                        ))}
                    </ol>

                    <div className={styles.stageWrap}>
                        <div className={styles.stage}>
                            {stageBar(shown)}
                            <div className={styles.screens}>
                                {screens.map((screen, i) => (
                                    <div
                                        key={i}
                                        className={styles.screen}
                                        data-visible={i === shown}
                                        data-play={i === active}
                                        aria-hidden={i !== shown}
                                    >
                                        {screen}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <ol className={styles.mobileSteps}>
                    {STEPS.map((step, i) => (
                        <li key={step.key} ref={register(i)} className={styles.mobileStep}>
                            <div className={styles.mobileHead}>
                                {stepText(step.key, i, "link" in step ? step.link : undefined)}
                            </div>
                            <div className={`${styles.stage} ${styles.stageMobile}`}>
                                {stageBar(i)}
                                <div className={styles.screens}>
                                    <div className={styles.screen} data-visible data-play={i <= seen}>
                                        {screens[i]}
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <div className={styles.cta}>
                <button type="button" className={styles.ctaPrimary} onClick={goToSearch}>
                    <ArrowUpIcon size={15} weight="bold" />
                    {t("home.steps.ctaSearch")}
                </button>
                <Link href="/map" className={styles.ctaGhost}>
                    <MapTrifoldIcon size={15} weight="light" />
                    {t("home.steps.ctaMap")}
                </Link>
            </div>
        </div>
    );
}
