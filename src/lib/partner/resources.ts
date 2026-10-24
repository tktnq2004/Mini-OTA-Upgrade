import { adminFetch, adminGet } from "@/lib/admin/apiClient";
import type { Hotel } from "@/lib/admin/types";
import type { PartnerBooking } from "./types";

// Cổng /partner dùng chung proxy /api/admin và phiên đăng nhập với /admin — chỉ khác
// các endpoint "của tôi" theo hotel người gọi.

// Hotel mà owner/staff đang quản lý (kèm rooms).
export const getMyHotel = () => adminGet<Hotel>("hotels/me");

// Mọi đơn đặt phòng của hotel người gọi, mới đặt nhất trước.
export const listHotelBookings = () => adminGet<PartnerBooking[]>("owner/bookings");

export const cancelBooking = (bookingId: number) =>
  adminFetch<void>(`bookings/${bookingId}/cancel`, { method: "PATCH" });
