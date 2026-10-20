"use client";

import { unwrapResponse } from "@/lib/hotels/envelope";
import type { DiscountUnit } from "@/lib/booking/discount";

// Tạo booking. QUY TẮC: 1 request = 1 booking = 1 khách sạn + 1 khoảng ngày
// (check-in/check-out CHUNG) + N phòng. Muốn đặt khách sạn khác thì đặt thêm
// lần nữa (xem WishlistView: khoá chọn chéo khách sạn).

// momo: mới có giao diện, backend chưa có API thanh toán MoMo nên chưa đặt được.
// bankTransfer: chuyển khoản qua SePay — khác payAtHotel/card ở chỗ không có
// bước "xác nhận" nào tại chỗ, chỉ hiện QR rồi chờ webhook SePay báo về.
export type PaymentMethod = "payAtHotel" | "card" | "momo" | "bankTransfer";

export interface CreateBookingPayload {
  roomIds: number[];
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  // Backend chỉ đọc 3 field này khi khách CHƯA đăng nhập (đăng nhập rồi thì
  // booking gắn theo tài khoản, bỏ qua guest*).
  guest: {
    fullName: string;
    email: string;
    phone: string;
  };
}

// Khớp enum PaymentStatus bên backend.
// PROCESSING: tiền đang xử lý / đã giữ trên thẻ chưa capture — job hết hạn
// gặp trường hợp này thì giữ phòng thay vì huỷ, sắp thành Completed.
// REFUND_PENDING/REFUNDED: tiền về SAU khi booking đã bị huỷ -> chờ hoàn tiền.
export type BookingPaymentStatus = "Pending" | "PROCESSING" | "Completed" | "Cancelled" | "REFUND_PENDING" | "REFUNDED";

export interface CreateBookingResult {
  bookingId: number;
  checkIn: string;
  checkOut: string;
  status: BookingPaymentStatus;
  // Tổng tiền CẢ kỳ ở (đã nhân số đêm), ví dụ 2 phòng 2.390.000 + 2.700.000
  // × 2 đêm = 10.180.000. Dùng làm số tiền phải trả khi backend chưa trả
  // payableAmount.
  totalAmount: number;
  // Khuyến mãi (docs/DISCOUNT_API.md mục 5) — đều tính cho CẢ kỳ ở. Optional
  // tới khi backend triển khai; dùng bookingPayable() thay vì đọc trực tiếp.
  nights?: number;
  subtotalAmount?: number;
  discountAmount?: number;
  payableAmount?: number;
  rooms: {
    roomId: number;
    roomName: string;
    pricePerNight: number;
    subtotal?: number;
    discountAmount?: number;
    total?: number;
    discounts?: BookingRoomDiscount[];
  }[];
  hotelName?: string;
  hotelAddress?: string;
  // Khách vãng lai: lấy từ Booking.guest*. Đã đăng nhập: backend tự lấy từ
  // User liên kết (xem BookingService.toDTO) — luôn có giá trị dù đăng nhập
  // hay không, trừ dữ liệu cũ thiếu sót.
  guestFullName?: string;
  guestEmail?: string;
  guestPhone?: string;
  // Chỉ có trong response tạo booking của khách vãng lai — backend chỉ lưu
  // hash nên không lấy lại được; cần cho header X-Booking-Token khi gọi
  // POST /payments/{id}/sync (xem rememberBookingToken).
  guestAccessToken?: string;
}

// 1 khuyến mãi backend đã áp cho 1 phòng của booking (snapshot lúc tạo).
export interface BookingRoomDiscount {
  discountId: number | null;
  name: string;
  discountValue: number;
  discountUnit: DiscountUnit;
  nights: number;
  amount: number;
}

// Số tiền khách phải trả cho cả kỳ ở. Backend có payableAmount (đã trừ
// khuyến mãi) thì dùng luôn; chưa có thì lùi về totalAmount (đã là tổng cả kỳ ở).
export function bookingPayable(booking: Pick<CreateBookingResult, "payableAmount" | "totalAmount">): number {
  return booking.payableAmount ?? booking.totalAmount;
}

// Idempotency-Key cho POST /bookings: 1 key cho 1 "lượt đặt" = đúng bộ
// phòng + ngày + thông tin khách. Bấm lại / mạng rớt rồi gửi lại / reload
// trang rồi bấm tiếp với cùng nội dung -> cùng key, backend trả lại booking
// đã tạo thay vì tạo booking thứ 2. Đổi bất kỳ field nào -> key mới. Tạo
// xong thì xoá key (đặt lại y hệt sau này là lượt mới). Lỗi thì GIỮ key: lần
// gửi lại có thể là retry của chính request đã tới được backend.
const IDEMPOTENCY_PREFIX = "MiniOTA-booking-idem-";

function bookingFingerprint(p: CreateBookingPayload): string {
  return JSON.stringify([
    [...p.roomIds].sort((a, b) => a - b),
    p.checkIn,
    p.checkOut,
    p.guest.fullName.trim(),
    p.guest.email.trim().toLowerCase(),
    p.guest.phone.trim(),
  ]);
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID chỉ có ở secure context (https/localhost) — mở dev qua IP LAN thì lùi về getRandomValues.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Dự phòng khi sessionStorage bị chặn (private mode...).
const memoryKeys: Record<string, string> = {};

function bookingIdempotencyKey(fingerprint: string): string {
  const storageKey = IDEMPOTENCY_PREFIX + fingerprint;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = newIdempotencyKey();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    // Storage bị chặn: vẫn chống trùng trong 1 lượt bấm nhờ key nhớ tạm.
    return (memoryKeys[fingerprint] ??= newIdempotencyKey());
  }
}

function forgetIdempotencyKey(fingerprint: string): void {
  delete memoryKeys[fingerprint];
  try {
    sessionStorage.removeItem(IDEMPOTENCY_PREFIX + fingerprint);
  } catch {
    // bỏ qua
  }
}

// POST /api/v1/bookings (qua proxy /api/public/bookings, tự gắn token nếu đã
// đăng nhập). Phòng đã bị đặt trong lúc chờ -> 409, message nằm trong
// PublicApiError để UI hiển thị. Kèm header Idempotency-Key (xem trên).
export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
  const fingerprint = bookingFingerprint(payload);
  const res = await fetch("/api/public/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": bookingIdempotencyKey(fingerprint) },
    body: JSON.stringify({
      roomIds: payload.roomIds,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guestFullName: payload.guest.fullName,
      guestEmail: payload.guest.email,
      guestPhone: payload.guest.phone,
    }),
  });
  const result = await unwrapResponse<CreateBookingResult>(res);
  forgetIdempotencyKey(fingerprint);
  return result;
}

// GET /api/v1/bookings/lookup (qua proxy /api/public, public — không cần
// đăng nhập) — dùng cho trang success poll trạng thái thanh toán trong lúc
// chờ webhook Stripe + webhook backend xác nhận (xem checkout/success).
// email phải khớp guestEmail (khách vãng lai) hoặc email tài khoản (đã đăng
// nhập) của chính booking đó, không thì backend trả lỗi "not found".
export async function getBookingStatus(bookingId: number, email: string): Promise<CreateBookingResult> {
  const params = new URLSearchParams({ id: String(bookingId), email });
  const res = await fetch(`/api/public/bookings/lookup?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  return unwrapResponse<CreateBookingResult>(res);
}
