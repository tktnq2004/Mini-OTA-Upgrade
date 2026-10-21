"use client";

import {
    ArrowRightIcon,
    BedIcon,
    BuildingsIcon,
    EnvelopeSimpleIcon,
    MapPinIcon,
    PhoneIcon,
    UserIcon,
} from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateVn, formatVnd } from "@/lib/format";
import { nightsBetween } from "@/lib/searchFilters";
import { bookingPayable, type CreateBookingResult } from "@/lib/booking/resources";
import styles from "./payment.module.css";

interface InvoiceBlockProps {
    booking: CreateBookingResult;
    // Email luôn lấy từ URL vì đó chính là email dùng để tra cứu booking (phải
    // khớp 100% với BookingService.lookup).
    email: string;
    // fullName/phone từ URL chỉ là fallback khi response backend thiếu field
    // (dữ liệu cũ) — ưu tiên dữ liệu backend, đáng tin hơn và sống sót qua refresh.
    fallbackFullName: string;
    fallbackPhone: string;
}

// Hoá đơn dùng chung cho mọi màn của trang thanh toán (chọn phương thức,
// đang xử lý, thành công, đã huỷ, hoàn tiền).
export default function InvoiceBlock({ booking, email, fallbackFullName, fallbackPhone }: InvoiceBlockProps) {
    const { t, language } = useLanguage();
    const nights = nightsBetween(booking.checkIn, booking.checkOut);
    // Số tiền thật phải trả do backend chốt (payableAmount, đã trừ khuyến
    // mãi). Chưa có field này thì lùi về totalAmount (đã là tổng cả kỳ ở).
    const grandTotal = bookingPayable(booking);
    const discountAmount = booking.discountAmount ?? 0;
    const guestFullName = booking.guestFullName || fallbackFullName;
    const guestPhone = booking.guestPhone || fallbackPhone;

    return (
        <div className={styles.invoice}>
            <p className={styles.invoiceSectionLabel}>{t("checkoutPayment.invoiceTitle")}</p>

            {booking.hotelName && (
                <div className={styles.invoiceHotel}>
                    <BuildingsIcon size={20} weight="light" />
                    <div>
                        <span className={styles.invoiceHotelName}>{booking.hotelName}</span>
                        {booking.hotelAddress && (
                            <span className={styles.invoiceHotelAddress}>
                                <MapPinIcon size={11} />
                                {booking.hotelAddress}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.invoiceDivider} />

            <div>
                <div className={styles.dateChips}>
                    <div className={styles.dateChip}>
                        <span className={styles.dateChipLabel}>{t("checkoutPayment.checkinLabel")}</span>
                        <span className={styles.dateChipValue}>{formatDateVn(booking.checkIn, language)}</span>
                    </div>
                    <ArrowRightIcon size={14} className={styles.dateChipsArrow} />
                    <div className={styles.dateChip}>
                        <span className={styles.dateChipLabel}>{t("checkoutPayment.checkoutLabel")}</span>
                        <span className={styles.dateChipValue}>{formatDateVn(booking.checkOut, language)}</span>
                    </div>
                </div>
                <p className={styles.nightsBadge}>{t("hotel.nightsSuffix", { count: nights })}</p>
            </div>

            <div className={styles.invoiceRooms}>
                {booking.rooms.map((room) => (
                    <div key={room.roomId}>
                        <div className={styles.invoiceRoomRow}>
                            <BedIcon size={14} weight="light" />
                            <span className={styles.invoiceRoomName}>{room.roomName}</span>
                            <span className={styles.invoiceRoomPrice}>
                                {formatVnd(room.pricePerNight)} × {nights}
                            </span>
                        </div>
                        {room.discounts?.map((d, i) => (
                            <div key={d.discountId ?? i} className={styles.invoiceDiscountRow}>
                                <span>{t("discount.line", { name: d.name, count: d.nights })}</span>
                                <span>-{formatVnd(d.amount)}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className={styles.invoiceDivider} />

            <div>
                <p className={styles.invoiceSectionLabel}>{t("checkoutPayment.guestInfoTitle")}</p>
                <div className={styles.guestInfo}>
                    {guestFullName && (
                        <div className={styles.guestRow}>
                            <UserIcon size={14} weight="light" />
                            <span>{guestFullName}</span>
                        </div>
                    )}
                    {email && (
                        <div className={styles.guestRow}>
                            <EnvelopeSimpleIcon size={14} weight="light" />
                            <span>{email}</span>
                        </div>
                    )}
                    {guestPhone && (
                        <div className={styles.guestRow}>
                            <PhoneIcon size={14} weight="light" />
                            <span>{guestPhone}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.invoiceDivider} />

            {discountAmount > 0 && (
                <div className={styles.invoiceDiscountSummary}>
                    <div>
                        <span>{t("discount.subtotal")}</span>
                        <span>{formatVnd(booking.subtotalAmount ?? grandTotal + discountAmount)}</span>
                    </div>
                    <div className={styles.invoiceDiscountRow}>
                        <span>{t("discount.totalDiscount")}</span>
                        <span>-{formatVnd(discountAmount)}</span>
                    </div>
                </div>
            )}

            <div className={styles.invoiceTotalRow}>
                <span>{t("wishlist.summaryTotal")}</span>
                <strong>{formatVnd(grandTotal)}</strong>
            </div>

            <div className={styles.invoiceCode}>
                {t("checkoutPayment.bookingCode")}: <strong>MO-{booking.bookingId}</strong>
            </div>
        </div>
    );
}
