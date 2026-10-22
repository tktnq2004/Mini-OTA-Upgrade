"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BedIcon,
  CaretDownIcon,
  CalendarBlankIcon,
  CreditCardIcon,
  SuitcaseRollingIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useAccount } from "@/components/auth/AccountProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AccountApiError } from "@/lib/auth/apiClient";
import { cancelMyBooking, getMyBookings } from "@/lib/auth/resources";
import { syncPayment } from "@/lib/booking/payment";
import type { MyBooking } from "@/lib/auth/types";
import { formatDateVn, formatVnd, parseServerDateTime } from "@/lib/format";
import { nightsBetween } from "@/lib/searchFilters";
import controls from "@/styles/controls.module.css";
import styles from "../account.module.css";
import BookingCardSkeleton from "./_components/BookingCardSkeleton";
import BookingTracker from "./_components/BookingTracker";

const SKELETON_CARDS = 3;

// paymentStatus -> màu nhãn. Giá trị lạ thì dùng nhãn xám mặc định.
const STATUS_CLASS: Record<string, string> = {
  Pending: styles.statusPending,
  PROCESSING: styles.statusPending,
  Completed: styles.statusCompleted,
  REFUND_PENDING: styles.statusCancelled,
  REFUNDED: styles.statusCancelled,
  Failed: styles.statusCancelled,
  Cancelled: styles.statusCancelled,
};

// Booking còn Pending/PROCESSING nhưng đã có PaymentIntent Stripe: có thể
// khách đã trả xong mà webhook chưa tới -> nhờ backend đối soát ngay
// (POST /payments/{id}/sync) rồi cập nhật nhãn trạng thái trên thẻ.
const needsSync = (b: MyBooking) =>
  Boolean(b.stripePaymentIntentId ?? b.stripePaymentId) &&
  (b.paymentStatus === "Pending" || b.paymentStatus === "PROCESSING");

// Khớp BookingCancellationService.assertCancellable: chỉ Pending còn hạn.
// expirationTime chưa có trong response thì coi như còn hạn (backend vẫn chặn).
const canCancel = (b: MyBooking) => {
  if ((b.paymentStatus ?? "Pending") !== "Pending") return false;
  const expiresAt = parseServerDateTime(b.expirationTime);
  return !(Number.isFinite(expiresAt) && expiresAt < Date.now());
};

const roomHref = (b: MyBooking, roomId?: number) =>
  !roomId
    ? "#"
    : b.hotel?.id
      ? `/hotel/${b.hotel.id}/room/${roomId}`
      : `/room/${roomId}`;

// Trang /checkout/payment tra booking qua lookup (id + email tài khoản), tự
// hiện đúng màn theo trạng thái: Pending -> chọn phương thức (tiếp tục thanh
// toán), Completed/PROCESSING/Cancelled/hoàn tiền -> màn trạng thái + hoá đơn.
const bookingDetailHref = (b: MyBooking, email: string) => {
  const params = new URLSearchParams({ bookingId: String(b.id), email });
  return `/checkout/payment?${params.toString()}`;
};

export default function BookingsView() {
  const { t, language } = useLanguage();
  const { user, ready } = useAccount();
  const router = useRouter();

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Booking đang mở thanh theo dõi trạng thái (bấm mã đơn để mở/đóng).
  const [trackedId, setTrackedId] = useState<number | null>(null);
  // Huỷ đơn: đang hỏi xác nhận ở thẻ nào / đang gửi / lỗi của thẻ nào.
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<{ id: number; message: string } | null>(null);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    setCancelError(null);
    try {
      await cancelMyBooking(id);
      setBookings((cur) => cur.map((x) => (x.id === id ? { ...x, paymentStatus: "Cancelled" } : x)));
      setConfirmCancelId(null);
    } catch (e) {
      setCancelError({
        id,
        message: e instanceof AccountApiError && e.message ? e.message : t("bookings.cancelError"),
      });
    } finally {
      setCancellingId(null);
    }
  };

  const loadBookings = () => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    getMyBookings()
      .then((list) => {
        // Mới nhất lên đầu.
        setBookings([...list].sort((a, b) => b.id - a.id));
        // Không chặn danh sách: từng booking sync xong thì tự cập nhật; lỗi
        // (Stripe tạm lỗi, 403...) thì giữ nguyên trạng thái đang hiện.
        list.filter(needsSync).forEach((b) => {
          syncPayment(b.id)
            .then((res) =>
              setBookings((cur) =>
                cur.map((x) => (x.id === res.bookingId ? { ...x, paymentStatus: res.paymentStatus } : x)),
              ),
            )
            .catch(() => {});
        });
      })
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
      <div
        className={styles.layout}
        aria-busy={!ready || loading || undefined}
        aria-label={!ready || loading ? t("bookings.loading") : undefined}
      >
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
          Array.from({ length: SKELETON_CARDS }, (_, i) => <BookingCardSkeleton key={i} />)
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
            const tracking = trackedId === b.id;
            const trackerId = `booking-track-${b.id}`;
            return (
              <article key={b.id} className={styles.bookingCard}>
                <div className={styles.bookingHead}>
                  <div>
                    <button
                      type="button"
                      className={styles.bookingCodeButton}
                      aria-expanded={tracking}
                      aria-controls={trackerId}
                      title={t("bookings.track.toggle")}
                      onClick={() => setTrackedId(tracking ? null : b.id)}
                    >
                      <strong>MO-{b.id}</strong>
                      <CaretDownIcon
                        size={13}
                        weight="bold"
                        className={tracking ? styles.caretOpen : styles.caret}
                      />
                    </button>
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

                {tracking && (
                  <BookingTracker
                    id={trackerId}
                    status={status}
                    bookedOn={b.bookingDate ? formatDateVn(b.bookingDate, language) : undefined}
                  />
                )}

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
                  <span>
                    {t("wishlist.summaryTotal")}
                    {b.discountAmount ? (
                      <span className={styles.bookingSaved}>
                        {t("discount.youSave", { amount: formatVnd(b.discountAmount) })}
                      </span>
                    ) : null}
                  </span>
                  <strong>{formatVnd(b.payableAmount ?? b.amount)}</strong>
                </div>

                {user && (
                  <div className={styles.bookingActions}>
                    {canCancel(b) &&
                      (confirmCancelId === b.id ? (
                        <span className={styles.cancelConfirm}>
                          <span className={styles.cancelQuestion}>{t("bookings.cancelConfirm")}</span>
                          <button
                            type="button"
                            className={styles.cancelYesButton}
                            disabled={cancellingId === b.id}
                            onClick={() => handleCancel(b.id)}
                          >
                            {cancellingId === b.id ? t("bookings.cancelling") : t("bookings.cancelYes")}
                          </button>
                          <button
                            type="button"
                            className={styles.cancelKeepButton}
                            disabled={cancellingId === b.id}
                            onClick={() => {
                              setConfirmCancelId(null);
                              setCancelError(null);
                            }}
                          >
                            {t("bookings.cancelKeep")}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.cancelBookingButton}
                          onClick={() => {
                            setConfirmCancelId(b.id);
                            setCancelError(null);
                          }}
                        >
                          <XCircleIcon size={15} weight="bold" />
                          {t("bookings.cancel")}
                        </button>
                      ))}
                    <Link href={bookingDetailHref(b, user.email)} className={controls.buttonGhost}>
                      {t("bookings.viewDetails")}
                      <ArrowRightIcon size={14} weight="bold" />
                    </Link>
                    {status === "Pending" && (
                      <Link href={bookingDetailHref(b, user.email)} className={controls.button}>
                        <CreditCardIcon size={15} weight="bold" />
                        {t("bookings.continuePayment")}
                      </Link>
                    )}
                  </div>
                )}

                {cancelError?.id === b.id && (
                  <p className={`${controls.error} ${styles.bookingActionError}`}>{cancelError.message}</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
