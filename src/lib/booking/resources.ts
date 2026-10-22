"use client";

import { accountFetch, accountGet } from "@/lib/auth/apiClient";
import type { DiscountUnit } from "@/lib/booking/discount";

// Mọi API booking đều cần phiên (docs/GUEST_BOOKING_API.md): khách đã đăng
// nhập dùng token tài khoản, khách vãng lai dùng token GUEST cấp sau khi xác
// minh email bằng OTP. Backend chỉ trả/cho trả tiền booking có
// user_id = chủ token -> đi qua proxy /api/account (gắn Bearer + tự refresh),
// lỗi là AccountApiError (401 = chưa có/hết phiên -> hiện GuestOtpForm).

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
  // Thông tin liên hệ lưu kèm booking (snapshot). Booking luôn gắn theo tài
  // khoản của token — email ở đây không quyết định ai xem được booking.
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
  // Hạn giữ chỗ thật do backend đặt lúc tạo (now + app.booking.expiration-minutes,
  // mặc định 15 phút). Quá hạn mà còn Pending thì BookingScheduler tự huỷ.
  // LocalDateTime không múi giờ — đọc bằng parseServerDateTime (lib/format).
  expirationTime?: string | null;
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
  // Thông tin liên hệ của booking (Booking.guest*, thiếu thì backend lấy từ
  // User liên kết — xem BookingService.toDTO). Trang payment hiện ở hoá đơn
  // và dùng cho billing_details của Stripe.
  guestFullName?: string;
  guestEmail?: string;
  guestPhone?: string;
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

// POST /api/v1/bookings — cần phiên (khách vãng lai xác minh OTP trước, xem
// CheckoutView). Phòng đã bị đặt trong lúc chờ -> 409, message nằm trong
// AccountApiError để UI hiển thị. Kèm header Idempotency-Key (xem trên).
export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
  const fingerprint = bookingFingerprint(payload);
  const result = await accountFetch<CreateBookingResult>("bookings", {
    method: "POST",
    headers: { "Idempotency-Key": bookingIdempotencyKey(fingerprint) },
    body: JSON.stringify({
      roomIds: payload.roomIds,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guestFullName: payload.guest.fullName,
      guestEmail: payload.guest.email,
      guestPhone: payload.guest.phone,
    }),
  });
  forgetIdempotencyKey(fingerprint);
  return result;
}

// GET /api/v1/bookings/{id} — chi tiết 1 booking của chủ token (trang
// /checkout/payment). Không phải của mình -> 403/404; chưa có phiên -> 401.
export const getBooking = (bookingId: number) => accountGet<CreateBookingResult>(`bookings/${bookingId}`);
