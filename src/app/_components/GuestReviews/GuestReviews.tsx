"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QuotesIcon, StarIcon } from "@phosphor-icons/react";
import SectionHeading from "../SectionHeading/SectionHeading";
import Scroller from "../Scroller/Scroller";
import Skeleton from "@/components/Skeleton/Skeleton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { listHotelReviews } from "@/lib/hotels/resources";
import type { Hotel, Review } from "@/lib/hotels/types";
import { formatDateVn } from "@/lib/format";
import styles from "./GuestReviews.module.css";

interface GuestReviewsProps {
    hotels: Hotel[];
    /** Class nền/đệm của section (từ page) — component tự render <section> để tự ẩn khi rỗng. */
    sectionClassName: string;
    /** Trang chủ đang tải danh sách khách sạn — hiện sẵn thẻ xương thay vì ẩn rồi bật ra. */
    loading?: boolean;
}

const SKELETON_CARDS = 3;

// Lấy review của tối đa ngần ấy khách sạn (mỗi khách sạn 1 request) để chọn trích dẫn.
const HOTELS_TO_SAMPLE = 6;
const MAX_REVIEWS = 6;
const MIN_RATING = 4;
const MIN_LENGTH = 20;

interface QuotedReview extends Review {
    hotelId: number;
    hotelName: string;
}

/**
 * "Khách nói gì về Trạm OTA" — trích review THẬT từ API của vài khách sạn nổi bật. Chỉ gọi API khi
 * section cuộn tới gần (không làm chậm lần tải đầu), và ẩn hẳn nếu không có review đủ tốt.
 */
export default function GuestReviews({ hotels, sectionClassName, loading = false }: GuestReviewsProps) {
    const { t, language } = useLanguage();
    const ref = useRef<HTMLElement>(null);
    const [reviews, setReviews] = useState<QuotedReview[] | null>(null);
    const sample = hotels.slice(0, HOTELS_TO_SAMPLE);
    const sampleKey = sample.map((h) => h.id).join(",");

    useEffect(() => {
        const el = ref.current;
        if (!el || !sampleKey) return;
        let cancelled = false;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                Promise.allSettled(sample.map((hotel) => listHotelReviews(hotel.id))).then((results) => {
                    if (cancelled) return;
                    const picked = results
                        .flatMap((result, i) =>
                            result.status === "fulfilled"
                                ? result.value.map((review) => ({
                                      ...review,
                                      hotelId: sample[i].id,
                                      hotelName: sample[i].name,
                                  }))
                                : []
                        )
                        .filter((r) => r.rating >= MIN_RATING && r.comment.trim().length >= MIN_LENGTH)
                        .sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt))
                        .slice(0, MAX_REVIEWS);
                    setReviews(picked);
                });
            },
            { rootMargin: "300px 0px" }
        );
        observer.observe(el);
        return () => {
            cancelled = true;
            observer.disconnect();
        };
        // sample suy ra từ sampleKey — chỉ chạy lại khi danh sách khách sạn thật sự đổi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sampleKey]);

    if (!loading && (!sampleKey || (reviews && reviews.length === 0))) return null;

    const average = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

    return (
        <section ref={ref} className={sectionClassName} aria-busy={!reviews || undefined}>
            <SectionHeading
                eyebrow={t("home.reviews.eyebrow")}
                title={t("home.reviews.title")}
                subtitle={
                    average !== null
                        ? t("home.reviews.subtitle", { avg: average.toFixed(1), count: reviews!.length })
                        : undefined
                }
            />
            <Scroller itemWidth="min(340px, 84vw)" ariaLabel={t("home.reviews.title")}>
                {reviews
                    ? reviews.map((review) => (
                          <figure key={review.id} className={styles.card}>
                              <div className={styles.top}>
                                  <span className={styles.stars} aria-label={`${review.rating}/5`}>
                                      {Array.from({ length: 5 }, (_, i) => (
                                          <StarIcon key={i} size={14} weight={i < review.rating ? "fill" : "regular"} />
                                      ))}
                                  </span>
                                  <QuotesIcon size={22} weight="fill" className={styles.quoteIcon} />
                              </div>
                              <blockquote className={styles.quote}>{review.comment}</blockquote>
                              <figcaption className={styles.author}>
                                  <span className={styles.avatar}>
                                      {(review.user.fullName || review.user.userName).charAt(0).toUpperCase()}
                                  </span>
                                  <span className={styles.who}>
                                      <strong>{review.user.fullName || review.user.userName}</strong>
                                      <span>
                                          {formatDateVn(review.createdAt, language)} ·{" "}
                                          <Link href={`/hotel/${review.hotelId}`}>{review.hotelName}</Link>
                                      </span>
                                  </span>
                              </figcaption>
                          </figure>
                      ))
                    : Array.from({ length: SKELETON_CARDS }, (_, i) => (
                          <div key={i} className={styles.card} aria-hidden>
                              <Skeleton width={84} height={14} />
                              <div className={styles.skeletonLines}>
                                  <Skeleton height={13} />
                                  <Skeleton height={13} />
                                  <Skeleton height={13} />
                                  <Skeleton width="60%" height={13} />
                              </div>
                              <div className={styles.author}>
                                  <Skeleton width={34} height={34} circle />
                                  <div className={styles.who}>
                                      <Skeleton width={110} height={13} />
                                      <Skeleton width={160} height={11} />
                                  </div>
                              </div>
                          </div>
                      ))}
            </Scroller>
        </section>
    );
}
