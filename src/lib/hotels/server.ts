import { getApiBaseUrl } from "./config";
import { unwrapResponse } from "./envelope";
import type { Hotel, Room } from "./types";

async function backendGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${getApiBaseUrl()}/${path}`, { cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null; // "không tồn tại" — để trang tự notFound()
  return unwrapResponse<T>(res);
}

// Dùng trong Server Component (trang chi tiết khách sạn/phòng) — gọi thẳng
// backend server-to-server, không qua proxy /api/public (không cần, không
// có CORS ở server-to-server, đỡ 1 lượt round-trip).
export const getHotelServer = (id: number) => backendGet<Hotel>(`hotels/${id}`);
export const getRoomServer = (id: number) => backendGet<Room>(`rooms/${id}`);
