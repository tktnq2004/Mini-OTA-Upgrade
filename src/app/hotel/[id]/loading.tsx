"use client";

import SiteHeader from "@/components/SiteHeader/SiteHeader";
import Skeleton from "@/components/Skeleton/Skeleton";
import FieldSkeleton from "@/components/Skeleton/FieldSkeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import RoomCardSkeleton from "./RoomCardSkeleton";
import styles from "./HotelDetail.module.css";

// Hiện ngay khi bấm vào 1 khách sạn, trong lúc server chờ backend (khách sạn + ảnh R2) —
// cùng bố cục với HotelDetail để trang không nhảy khi dữ liệu về.
export default function HotelLoading() {
    const { t } = useLanguage();

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout} aria-busy="true" aria-label={t("hotels.loading")}>
                <aside className={styles.infoPanel}>
                    <Skeleton width={110} height={12} />
                    <div className={styles.thumbWrap}>
                        <Skeleton fill />
                    </div>
                    <div className={styles.identity}>
                        <Skeleton width="70%" height={18} />
                        <Skeleton width="90%" height={13} />
                    </div>
                    <div className={styles.filterCard}>
                        <Skeleton width={120} height={14} />
                        <div className={styles.dateRow}>
                            <FieldSkeleton labelWidth={70} />
                            <FieldSkeleton labelWidth={70} />
                        </div>
                        <FieldSkeleton />
                        <FieldSkeleton labelWidth={110} />
                        <FieldSkeleton labelWidth={60} />
                    </div>
                </aside>

                <section className={styles.roomsPanel}>
                    <div className={styles.roomsHeader}>
                        <Skeleton width={180} height={19} />
                        <Skeleton width={260} height={12} className={styles.skeletonSubline} />
                    </div>
                    <div className={styles.roomsGrid}>
                        {Array.from({ length: 4 }, (_, i) => (
                            <RoomCardSkeleton key={i} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
