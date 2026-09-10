// Logic dùng chung cho trang wishlist (/wishlist) và trang đặt phòng (/checkout):
// nhóm phòng theo khách sạn và tra lại object Room/Hotel từ backend.
//
// Wishlist chỉ lưu hotelId/roomId — phải tải lại Hotel (kèm rooms) từ backend
// mới biết tên/giá phòng hiện tại. getHotel trả CẢ mảng rooms trong 1 lần gọi
// nên chỉ cần gọi 1 lần cho mỗi hotelId.

import { getHotel } from "@/lib/hotels/client";
import type { Hotel, Room } from "@/lib/hotels/types";
import type { WishlistItem } from "./wishlistStorage";

export interface HotelGroup {
    hotel: Hotel;
    items: WishlistItem[];
}

// Trả Map hotelId -> Hotel (kèm rooms) cho các hotelId đang có. Hotel đã bị xoá
// thì bỏ qua, không throw — dòng wishlist tương ứng tự "biến mất" khỏi kết quả
// nhóm thay vì làm sập cả trang.
export async function loadHotelsForWishlist(items: WishlistItem[]): Promise<Map<number, Hotel>> {
    const ids = Array.from(new Set(items.map((i) => i.hotelId)));
    const results = await Promise.all(ids.map((id) => getHotel(id).catch(() => null)));
    const map = new Map<number, Hotel>();
    ids.forEach((id, i) => {
        const hotel = results[i];
        if (hotel) map.set(id, hotel);
    });
    return map;
}

export function groupWishlistByHotel(
    items: WishlistItem[],
    hotelsById: Map<number, Hotel>,
): HotelGroup[] {
    const byHotel = new Map<number, WishlistItem[]>();
    for (const item of items) {
        const list = byHotel.get(item.hotelId) ?? [];
        list.push(item);
        byHotel.set(item.hotelId, list);
    }

    const result: HotelGroup[] = [];
    for (const [hotelId, hotelItems] of byHotel) {
        const hotel = hotelsById.get(hotelId);
        if (hotel) result.push({ hotel, items: hotelItems });
    }
    return result;
}

export function findRoom(
    hotelId: number,
    roomId: number,
    hotelsById: Map<number, Hotel>,
): Room | undefined {
    return hotelsById.get(hotelId)?.rooms?.find((r) => r.id === roomId);
}
