import type { BookingPaymentStatus } from "@/lib/booking/resources";
import { nightsBetween } from "@/lib/searchFilters";
import type { PartnerBooking } from "./types";

// Mã đơn hiển thị — cùng quy ước "MO-<id>" với trang đặt phòng của khách.
export const bookingCode = (b: Pick<PartnerBooking, "bookingId">) => `MO-${b.bookingId}`;

export const bookingNights = (b: Pick<PartnerBooking, "checkIn" | "checkOut">) =>
  Math.max(1, nightsBetween(b.checkIn, b.checkOut));

// Backend lưu giá 1 đêm của cả đơn (chưa nhân số đêm) — tổng = Σ giá/đêm từng phòng × số đêm.
export function bookingTotal(b: Pick<PartnerBooking, "checkIn" | "checkOut" | "rooms" | "totalAmount">): number {
  const perNight = b.rooms.length > 0 ? b.rooms.reduce((sum, r) => sum + r.pricePerNight, 0) : b.totalAmount;
  return perNight * bookingNights(b);
}

const CANCELLED: BookingPaymentStatus[] = ["Cancelled", "REFUND_PENDING", "REFUNDED"];
export const isCancelled = (b: Pick<PartnerBooking, "paymentStatus">) => CANCELLED.includes(b.paymentStatus);

export const STATUS_LABEL: Record<BookingPaymentStatus, string> = {
  Pending: "Chưa thanh toán",
  PROCESSING: "Đang xác nhận",
  Completed: "Đã thanh toán",
  Cancelled: "Đã huỷ",
  REFUND_PENDING: "Chờ hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
};

// Nhóm màu của nhãn trạng thái — map sang class CSS ở trang.
export type StatusTone = "success" | "warning" | "neutral" | "danger";
export const STATUS_TONE: Record<BookingPaymentStatus, StatusTone> = {
  Pending: "warning",
  PROCESSING: "neutral",
  Completed: "success",
  Cancelled: "danger",
  REFUND_PENDING: "danger",
  REFUNDED: "neutral",
};

// Đơn đang ở giai đoạn nào so với hôm nay (yyyy-mm-dd). Ngày trả phòng tính là đã trả.
export type BookingStage = "upcoming" | "staying" | "departed" | "cancelled";
export function stageOf(b: Pick<PartnerBooking, "checkIn" | "checkOut" | "paymentStatus">, today: string): BookingStage {
  if (isCancelled(b)) return "cancelled";
  if (b.checkIn > today) return "upcoming";
  if (b.checkOut > today) return "staying";
  return "departed";
}

// Tìm theo mã đơn (MO-12 hoặc 12), tên, email hoặc SĐT khách.
export function matchesQuery(b: PartnerBooking, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [bookingCode(b), String(b.bookingId), b.guestFullName, b.guestEmail, b.guestPhone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
