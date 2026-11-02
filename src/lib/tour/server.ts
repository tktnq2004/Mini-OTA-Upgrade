import { getApiBaseUrl } from "@/lib/hotels/config";
import { unwrapResponse } from "@/lib/api/public";
import type { Tour } from "./types";

// Dùng trong Server Component (trang public hotel/room) — gọi thẳng backend
// server-to-server, giống media/server.ts. GET tour đã public (xem
// SecurityConfig.PUBLIC_GET_ENDPOINTS). roomId: mở tour ở scene đầu của phòng đó.
//
// Tour 360° chỉ là phần "cải thiện thêm" cho trang — lỗi ở đây không được làm
// sập cả trang hotel/room, nên nuốt lỗi và trả null (trang chỉ ẩn nút xem 360°).
export async function getTourServer(hotelId: number, roomId?: number): Promise<Tour | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/tours/hotels/${hotelId}${roomId ? `?roomId=${roomId}` : ""}`, {
      cache: "no-store",
    });
    return await unwrapResponse<Tour>(res);
  } catch {
    return null;
  }
}
