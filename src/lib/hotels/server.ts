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

// Room không mang hotelId (JsonIgnore) và backend chưa có API tra ngược
// room -> hotel, nên dựng map từ danh sách khách sạn (mỗi hotel kèm rooms[].id)
// và giữ trong bộ nhớ 10 phút. Room mới tạo sau khi dựng map thì dựng lại 1 lần.
const ROOM_HOTEL_TTL_MS = 10 * 60 * 1000;
let roomHotelCache: { map: Map<number, number>; at: number } | null = null;

async function loadRoomHotelMap(): Promise<Map<number, number>> {
  const res = await fetch(`${getApiBaseUrl()}/hotels?page=1&size=10000`, { cache: "no-store" });
  const data = await unwrapResponse<{ result?: Hotel[] } | Hotel[]>(res);
  const hotels = Array.isArray(data) ? data : (data?.result ?? []);
  const map = new Map<number, number>();
  for (const h of hotels) for (const r of h.rooms ?? []) map.set(r.id, h.id);
  roomHotelCache = { map, at: Date.now() };
  return map;
}

export async function findHotelIdOfRoom(roomId: number): Promise<number | null> {
  const fresh = roomHotelCache && Date.now() - roomHotelCache.at < ROOM_HOTEL_TTL_MS;
  let map = fresh ? roomHotelCache!.map : await loadRoomHotelMap();
  if (!map.has(roomId) && fresh) map = await loadRoomHotelMap();
  return map.get(roomId) ?? null;
}
