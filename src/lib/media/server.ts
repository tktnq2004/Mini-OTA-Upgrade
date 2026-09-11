import { getApiBaseUrl } from "@/lib/hotels/config";
import { unwrapResponse } from "@/lib/hotels/envelope";
import type { MediaAsset, MediaKind, MediaOwnerType } from "./types";

// Dùng trong Server Component (trang public hotel/room) — gọi thẳng backend
// server-to-server, giống hotels/server.ts. GET /media đã public (xem
// SecurityConfig.PUBLIC_GET_ENDPOINTS), không cần cookie/token.
//
// Ảnh chỉ là phần "cải thiện thêm" cho trang — lỗi ở đây (backend tạm down,
// network lỗi, R2 chưa cấu hình...) không được làm sập cả trang hotel/room,
// nên luôn nuốt lỗi và rơi về mảng rỗng để caller tự fallback sang
// hotel.image/room.thumbnail cũ.
async function listMediaServer(ownerType: MediaOwnerType, ownerId: number, kind?: MediaKind): Promise<MediaAsset[]> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/media?ownerType=${ownerType}&ownerId=${ownerId}${kind ? `&kind=${kind}` : ""}`,
      { cache: "no-store" }
    );
    return await unwrapResponse<MediaAsset[]>(res);
  } catch {
    return [];
  }
}

// Hotel chỉ có đúng 1 kind (THUMBNAIL) nhưng vẫn truyền tường minh — phòng
// khi sau này hotel có thêm loại ảnh khác thì chỗ gọi không bị lấy nhầm.
export const getHotelThumbnailServer = async (hotelId: number): Promise<string | undefined> =>
  (await listMediaServer("HOTEL", hotelId, "THUMBNAIL"))[0]?.url;

export const getRoomThumbnailServer = async (roomId: number): Promise<string | undefined> =>
  (await listMediaServer("ROOM", roomId, "THUMBNAIL"))[0]?.url;

export const listRoomPanoramaServer = (roomId: number) => listMediaServer("ROOM", roomId, "PANORAMA");

// Lấy ảnh thumbnail cho NHIỀU room cùng lúc — trang chi tiết hotel liệt kê
// nhiều RoomCard, trang chi tiết room có mục "phòng khác", đều chỉ cần 1 ảnh
// đại diện mỗi room (không cần panorama). Chạy song song, lỗi ở 1 room
// không ảnh hưởng room khác (listMediaServer tự nuốt lỗi).
export async function getRoomThumbnailsByIds(roomIds: number[]): Promise<Record<number, string | undefined>> {
  const entries = await Promise.all(roomIds.map(async (id) => [id, await getRoomThumbnailServer(id)] as const));
  return Object.fromEntries(entries);
}
