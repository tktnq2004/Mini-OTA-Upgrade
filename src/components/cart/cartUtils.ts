// Logic hiển thị dùng chung giữa trang giỏ phòng (/cart) và trang thanh toán
// (/checkout) — cả hai đều cần nhóm các dòng trong giỏ theo khách sạn và tính
// tiền từng dòng/tổng đơn theo cùng một cách.
//
// Giỏ chỉ lưu hotelId/roomId (không lưu cả object) — nên phải tự tải lại
// Hotel (kèm rooms) từ backend thật mới biết tên/giá phòng hiện tại. getHotel
// trả về CẢ mảng rooms của hotel đó trong 1 lần gọi, nên chỉ cần gọi 1 lần
// mỗi hotelId duy nhất trong giỏ (không phải gọi riêng từng room).

import { getHotel } from "@/lib/hotels/client";
import type { Hotel, Room } from "@/lib/hotels/types";
import { nightsBetween } from "@/lib/searchFilters";
import type { CartItem } from "./cartStorage";

export interface HotelGroup {
    hotel: Hotel;
    items: CartItem[];
}

// Gọi 1 lần lúc vào trang /cart, /checkout — trả Map hotelId -> Hotel (kèm
// rooms) cho các hotelId đang có trong giỏ. Hotel không còn tồn tại (đã bị
// xoá) thì bỏ qua, không throw — dòng giỏ tương ứng sẽ tự "biến mất" khỏi
// kết quả nhóm/tổng tiền thay vì làm sập cả trang.
export async function loadHotelsForCart(items: CartItem[]): Promise<Map<number, Hotel>> {
    const ids = Array.from(new Set(items.map((i) => i.hotelId)));
    const results = await Promise.all(ids.map((id) => getHotel(id).catch(() => null)));
    const map = new Map<number, Hotel>();
    ids.forEach((id, i) => {
        const hotel = results[i];
        if (hotel) map.set(id, hotel);
    });
    return map;
}

export function groupCartItemsByHotel(items: CartItem[], hotelsById: Map<number, Hotel>): HotelGroup[] {
    const byHotel = new Map<number, CartItem[]>();
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

export function findRoomForItem(item: CartItem, hotelsById: Map<number, Hotel>): Room | undefined {
    return hotelsById.get(item.hotelId)?.rooms?.find((r) => r.id === item.roomId);
}

export function cartLineTotal(room: Room, item: CartItem): number {
    return room.price * item.quantity * nightsBetween(item.checkin, item.checkout);
}

export function cartGrandTotal(items: CartItem[], hotelsById: Map<number, Hotel>): number {
    return items.reduce((sum, item) => {
        const room = findRoomForItem(item, hotelsById);
        return room ? sum + cartLineTotal(room, item) : sum;
    }, 0);
}

export function cartTotalRooms(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
}
