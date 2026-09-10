"use client";

// Tạo booking. QUY TẮC (đã chốt với team): 1 request = 1 booking = 1 khách sạn
// + 1 khoảng ngày (check-in/check-out CHUNG) + N phòng. Muốn đặt khách sạn
// khác thì đặt thêm lần nữa (xem WishlistView: khoá chọn chéo khách sạn).

export type PaymentMethod = "payAtHotel" | "card";

export interface CreateBookingPayload {
  hotelId: number;
  roomIds: number[];
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  guests: number;
  guest: {
    fullName: string;
    email: string;
    phone: string;
    note?: string;
  };
  payment: {
    method: PaymentMethod;
    // Chỉ gửi khi method === "card". FE demo không lưu/không mã hoá —
    // backend thật nên đẩy sang cổng thanh toán, không tự nhận số thẻ.
    card?: { number: string; name: string; expiry: string; cvv: string };
  };
}

export interface CreateBookingResult {
  code: string; // mã xác nhận đặt phòng
  bookingId?: number;
}

// TODO(backend): POST /api/public/bookings với body = CreateBookingPayload.
//   - Trả { data: { code, bookingId } } (bọc envelope) khi thành công.
//   - 409 + { error, data: { soldOutRoomIds: number[] } } nếu 1 phòng đã kín
//     trong khoảng ngày chọn (giữa lúc thêm wishlist và lúc đặt).
//   - Gắn userId nếu người dùng đã đăng nhập (đọc cookie ở proxy route),
//     ngược lại lưu guest.* để tra cứu qua GET /api/public/bookings/lookup.
//   Proxy /api/public hiện chỉ cho GET — backend cần mở route POST cho path này.
//
// Hiện chưa có API → sinh mã demo phía client để luồng UI chạy được.
export async function createBooking(
  payload: CreateBookingPayload,
): Promise<CreateBookingResult> {
  // const res = await fetch("/api/public/bookings", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // return unwrapResponse<CreateBookingResult>(res);

  await new Promise((r) => setTimeout(r, 400)); // giả lập độ trễ mạng
  void payload;
  return { code: `MO-${Date.now().toString(36).toUpperCase()}` };
}
