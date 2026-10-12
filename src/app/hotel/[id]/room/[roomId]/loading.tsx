"use client";

import SiteHeader from "@/components/SiteHeader/SiteHeader";
import Skeleton from "@/components/Skeleton/Skeleton";
import FieldSkeleton from "@/components/Skeleton/FieldSkeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./RoomDetail.module.css";

const THUMBS = 4;

// Hiện ngay khi mở 1 phòng, trong lúc server chờ backend (khách sạn, phòng, panorama, ảnh) —
// cùng bố cục với RoomDetailView để trang không nhảy khi dữ liệu về.
export default function RoomLoading() {
    const { t } = useLanguage();

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout} aria-busy="true" aria-label={t("room.loading")}>
                <span className={styles.backLink}>
                    <Skeleton width={120} height={12} />
                </span>

                <div className={styles.mainColumn}>
                    <div className={styles.gallery}>
                        <div className={styles.heroWrap}>
                            <Skeleton fill />
                        </div>
                        <div className={styles.thumbRow}>
                            {Array.from({ length: THUMBS }, (_, i) => (
                                <Skeleton key={i} width={64} height={48} />
                            ))}
                        </div>
                    </div>

                    <div className={styles.titleBlock}>
                        <Skeleton width={70} height={20} radius="var(--radius-pill)" />
                        <Skeleton width="55%" height={24} />
                        <Skeleton width="35%" height={14} />
                        <Skeleton width="60%" height={13} />
                    </div>

                    <section className={styles.section}>
                        <Skeleton width={120} height={15} />
                        <div className={styles.skeletonLines}>
                            <Skeleton height={13} />
                            <Skeleton height={13} />
                            <Skeleton width="70%" height={13} />
                        </div>
                    </section>
                </div>

                <aside className={styles.bookingColumn}>
                    <div className={styles.bookingCard}>
                        <div className={styles.priceHead}>
                            <Skeleton width={140} height={24} />
                        </div>
                        <Skeleton height={250} />
                        <FieldSkeleton labelWidth={60} />
                        <div className={styles.priceBreakdown}>
                            <Skeleton width={80} height={13} />
                            <Skeleton width={110} height={18} />
                        </div>
                        <div className={styles.bookingActions}>
                            <Skeleton width="calc(50% - 4px)" height={40} />
                            <Skeleton width="calc(50% - 4px)" height={40} />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
