// Logic hiển thị dùng chung giữa trang giỏ phòng (/cart) và trang thanh toán
// (/checkout) — cả hai đều cần nhóm các dòng trong giỏ theo khách sạn và tính
// tiền từng dòng/tổng đơn theo cùng một cách.

import { hotels, type Hotel } from "@/data/hotels.data";
import { generateRoomsForHotel, type Room } from "@/data/rooms.data";
import { nightsBetween } from "@/lib/searchFilters";
import type { CartItem } from "./cartStorage";

export interface HotelGroup {
    hotel: Hotel;
    items: CartItem[];
}

export function groupCartItemsByHotel(items: CartItem[]): HotelGroup[] {
    const byHotel = new Map<number, CartItem[]>();
    for (const item of items) {
        const list = byHotel.get(item.hotelId) ?? [];
        list.push(item);
        byHotel.set(item.hotelId, list);
    }

    const result: HotelGroup[] = [];
    for (const [hotelId, hotelItems] of byHotel) {
        const hotel = hotels.find((h) => h.id === hotelId);
        if (hotel) result.push({ hotel, items: hotelItems });
    }
    return result;
}

export function findRoomForItem(item: CartItem): Room | undefined {
    return generateRoomsForHotel(item.hotelId).find((r) => r.id === item.roomId);
}

export function cartLineTotal(room: Room, item: CartItem): number {
    return room.price * item.quantity * nightsBetween(item.checkin, item.checkout);
}

export function cartGrandTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => {
        const room = findRoomForItem(item);
        return room ? sum + cartLineTotal(room, item) : sum;
    }, 0);
}

export function cartTotalRooms(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
}
