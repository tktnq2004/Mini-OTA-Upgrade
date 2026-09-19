"use client";

import { unwrapResponse } from "@/lib/hotels/envelope";

// Tạo booking. QUY TẮC: 1 request = 1 booking = 1 khách sạn + 1 khoảng ngày
// (check-in/check-out CHUNG) + N phòng. Muốn đặt khách sạn khác thì đặt thêm
// lần nữa (xem WishlistView: khoá chọn chéo khách sạn).

export type PaymentMethod = "payAtHotel" | "card";

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

// Khớp ResBookingDTO. Booking mới luôn ở trạng thái Pending.
export interface CreateBookingResult {
  bookingId: number;
  checkIn: string;
  checkOut: string;
  status: "Pending" | "Completed" | "Cancelled";
  totalAmount: number;
  rooms: { roomId: number; roomName: string; pricePerNight: number }[];
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

// DEMO thanh toán thẻ: backend chưa có endpoint thanh toán / xác nhận, booking
// dừng ở Pending. Hàm này chỉ giả lập cổng thanh toán (không gửi/lưu số thẻ đi
// đâu). Khi có API, thay bằng lời gọi thật ở đây.
export async function simulateCardPayment(): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
}
