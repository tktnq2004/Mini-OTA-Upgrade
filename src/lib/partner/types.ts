import type { BookingPaymentStatus } from "@/lib/booking/resources";

// 1 đơn đặt phòng của khách sạn — GET /owner/bookings (ResBookingDTO bên backend).
export interface PartnerBookingRoom {
  roomId: number;
  roomName: string;
  pricePerNight: number;
}

export interface PartnerBooking {
  bookingId: number;
  checkIn: string;
  checkOut: string;
  paymentStatus: BookingPaymentStatus;
  paymentProvider: string | null;
  // Hạn giữ chỗ khi chưa thanh toán (LocalDateTime, không có múi giờ).
  expirationTime: string | null;
  bookingDate: string | null;
  // Giá 1 đêm của cả đơn (backend chưa nhân số đêm) — dùng bookingTotal() để có tổng.
  totalAmount: number;
  rooms: PartnerBookingRoom[];
  guestFullName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
}
