"use client";

import { unwrapResponse } from "@/lib/hotels/envelope";

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

export interface CreateBookingResult {
  bookingId: number;
  checkIn: string;
  checkOut: string;
  status: "Pending" | "Completed" | "Cancelled";
  totalAmount: number;
  rooms: { roomId: number; roomName: string; pricePerNight: number }[];
  hotelName?: string;
  hotelAddress?: string;
  // Khách vãng lai: lấy từ Booking.guest*. Đã đăng nhập: backend tự lấy từ
  // User liên kết (xem BookingService.toDTO) — luôn có giá trị dù đăng nhập
  // hay không, trừ dữ liệu cũ thiếu sót.
  guestFullName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

// POST /api/v1/bookings (qua proxy /api/public/bookings, tự gắn token nếu đã
// đăng nhập). Phòng đã bị đặt trong lúc chờ -> 409, message nằm trong
// PublicApiError để UI hiển thị.
export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
  const res = await fetch("/api/public/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomIds: payload.roomIds,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guestFullName: payload.guest.fullName,
      guestEmail: payload.guest.email,
      guestPhone: payload.guest.phone,
    }),
  });
  return unwrapResponse<CreateBookingResult>(res);
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
