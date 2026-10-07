"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedIcon,
  CalendarBlankIcon,
  SuitcaseRollingIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AccountApiError } from "@/lib/auth/apiClient";
import { getMyBookings } from "@/lib/auth/resources";
import type { MyBooking } from "@/lib/auth/types";
import { formatDateVn, formatVnd } from "@/lib/format";
import { nightsBetween } from "@/lib/searchFilters";
import controls from "@/styles/controls.module.css";
import styles from "../account.module.css";

// paymentStatus -> màu nhãn. Giá trị lạ thì dùng nhãn xám mặc định.
const STATUS_CLASS: Record<string, string> = {
  Pending: styles.statusPending,
  Completed: styles.statusCompleted,
  Failed: styles.statusCancelled,
  Cancelled: styles.statusCancelled,
};

const roomHref = (b: MyBooking, roomId?: number) =>
  !roomId
    ? "#"
    : b.hotel?.id
      ? `/hotel/${b.hotel.id}/room/${roomId}`
      : `/room/${roomId}`;

export default function BookingsView() {
  const { t, language } = useLanguage();
  const { user, ready } = useAccount();
  const router = useRouter();

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadBookings = () => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    getMyBookings()
      // Mới nhất lên đầu.
      .then((list) => setBookings([...list].sort((a, b) => b.id - a.id)))
      .catch((e) =>
        setLoadError(
          e instanceof AccountApiError ? e.message : t("bookings.loadError"),
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(loadBookings, [ready, user, router, t]); // eslint-disable-line react-hooks/set-state-in-effect -- tải danh sách từ API, một external system

  return (
    <div className={styles.page}>
      <SiteHeader />
      <div className={styles.layout}>
        <div className={styles.header}>
          <span className={styles.avatar}>
            <SuitcaseRollingIcon size={20} weight="bold" />
          </span>
          <div>
            <h1>{t("nav.myBookings")}</h1>
            <p>{t("bookings.subtitle")}</p>
          </div>
        </div>

        {!ready || loading ? (
          <p className={styles.emptyState}>{t("bookings.loading")}</p>
        ) : loadError ? (
          <p className={controls.error}>{loadError}</p>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t("bookings.empty")}</p>
            <Link
              href="/hotels"
              className={`${controls.button} ${styles.emptyAction}`}
            >
              {t("bookings.browse")}
            </Link>
          </div>
        ) : (
          bookings.map((b) => {
            const nights = nightsBetween(b.checkIn, b.checkOut);
            const status = b.paymentStatus ?? "Pending";
            const statusKey = `bookings.status.${status}`;
            const statusLabel = t(statusKey);
            const rooms = b.bookingRooms ?? [];
            return (
              <article key={b.id} className={styles.bookingCard}>
                <div className={styles.bookingHead}>
                  <div>
                    <strong>MO-{b.id}</strong>
                    {b.bookingDate && (
                      <span className={styles.bookedOn}>
                        {t("bookings.bookedOn", {
                          date: formatDateVn(b.bookingDate, language),
                        })}
                      </span>
                    )}
                  </div>
                  <span
                    className={`${styles.statusBadge} ${STATUS_CLASS[status] ?? ""}`}
                  >
                    {statusLabel === statusKey ? status : statusLabel}
                  </span>
                </div>

                <p className={styles.bookingMeta}>
                  <CalendarBlankIcon size={14} />
                  {formatDateVn(b.checkIn, language)} → {formatDateVn(b.checkOut, language)}
                  <span className={styles.dot}>·</span>
                  {t("hotel.nightsSuffix", { count: nights })}
                </p>

                {rooms.length > 0 && (
                  <ul className={styles.bookingRooms}>
                    {rooms.map((br) => (
                      <li key={br.id}>
                        <Link
                          href={roomHref(b, br.room?.id)}
                          className={styles.roomLink}
                          aria-disabled={!br.room}
                        >
                          <ImageWithFallback
                            src={br.room?.thumbnail ?? ""}
                            alt={br.room?.name ?? ""}
                            className={styles.roomThumb}
                            fallbackClassName={styles.roomThumbFallback}
                            fallback={<BedIcon size={14} weight="light" />}
                          />
                          <span className={styles.roomName}>
                            {br.room?.name}
                          </span>
                          <span className={styles.roomPrice}>
                            {formatVnd(br.pricePerNight)} {t("room.perNight")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className={styles.bookingTotal}>
                  <span>{t("wishlist.summaryTotal")}</span>
                  <strong>{formatVnd(b.amount * Math.max(nights, 1))}</strong>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
