// Wishlist = danh sách phòng đã lưu để cân nhắc đặt sau. CHỈ chứa tham chiếu
// phòng + khách sạn — KHÔNG có ngày nhận/trả, KHÔNG có số khách, KHÔNG có số
// lượng. Ngày & số khách được chọn ở màn đặt phòng (/checkout).
//
// Hai nguồn lưu:
//  - Chưa đăng nhập: localStorage (các hàm load/save/clear).
//  - Đã đăng nhập: backend (GET/POST/DELETE /wishlist qua proxy /api/account,
//    có sẵn cookie + refresh token). WishlistProvider chọn nguồn theo session.
//
// Backend trả Wishlist { id, room } — room KHÔNG kèm hotelId (Room.hotel bị
// @JsonIgnore) trong khi FE cần hotelId để nhóm theo khách sạn. Vì vậy FE giữ
// thêm 1 bảng phụ roomId -> hotelId trong localStorage (loadHotelMap), và với
// phòng chưa có trong bảng thì dò qua danh sách khách sạn (resolveHotelIds).

import { unwrapResponse } from "@/lib/hotels/envelope";
import { listHotels } from "@/lib/hotels/client";

export interface WishlistItem {
    hotelId: number;
    roomId: number;
    addedAt: number;
}

const STORAGE_KEY = "MiniOTA-wishlist";
const HOTEL_MAP_KEY = "MiniOTA-wishlist-hotels";
// Đọc cả key cũ "MiniOTA-cart" 1 lần để không mất lựa chọn của người dùng
// khi đổi từ "giỏ phòng" sang "wishlist".
const LEGACY_KEY = "MiniOTA-cart";

export function loadWishlist(): WishlistItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Bỏ mọi field thừa (checkin/checkout/guests/quantity) từ dữ liệu cũ.
        return parsed
            .filter((it) => it && typeof it.hotelId === "number" && typeof it.roomId === "number")
            .map((it) => ({
                hotelId: it.hotelId,
                roomId: it.roomId,
                addedAt: typeof it.addedAt === "number" ? it.addedAt : Date.now(),
            }));
    } catch {
        return [];
    }
}

export function saveWishlist(items: WishlistItem[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        localStorage.removeItem(LEGACY_KEY);
    } catch {
        // localStorage đầy hoặc bị chặn (ẩn danh) — wishlist vẫn dùng được
        // trong phiên hiện tại, chỉ không lưu qua lần tải lại.
    }
}

export function clearWishlist(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_KEY);
    } catch {
        // bỏ qua
    }
}

export function loadHotelMap(): Record<number, number> {
    try {
        const raw = localStorage.getItem(HOTEL_MAP_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export function rememberHotels(entries: { roomId: number; hotelId: number }[]): void {
    if (entries.length === 0) return;
    try {
        const map = loadHotelMap();
        for (const e of entries) map[e.roomId] = e.hotelId;
        localStorage.setItem(HOTEL_MAP_KEY, JSON.stringify(map));
    } catch {
        // bỏ qua — chỉ là cache
    }
}

// ----- API cho người đã đăng nhập -----

interface ServerWishlistEntry {
    id: number;
    room: { id: number };
}

async function account(path: string, method: "GET" | "POST" | "DELETE") {
    const res = await fetch(`/api/account/${path}`, { method, cache: "no-store" });
    return unwrapResponse<unknown>(res);
}

export async function fetchServerRoomIds(): Promise<number[]> {
    const data = (await account("wishlist", "GET")) as ServerWishlistEntry[];
    return Array.from(new Set(data.map((e) => e.room.id)));
}

export const addServerRoom = (roomId: number) => account(`wishlist/rooms/${roomId}`, "POST");
export const removeServerRoom = (roomId: number) => account(`wishlist/rooms/${roomId}`, "DELETE");

// roomId -> hotelId cho các phòng chưa biết: dò qua danh sách khách sạn (cần
// backend trả kèm rooms trong GET /hotels). Phòng không tìm ra thì bị bỏ khỏi
// kết quả — WishlistView cũng không hiển thị được phòng không rõ khách sạn.
export async function resolveHotelIds(roomIds: number[]): Promise<Map<number, number>> {
    const known = loadHotelMap();
    const out = new Map<number, number>();
    const missing: number[] = [];
    for (const id of roomIds) {
        if (known[id]) out.set(id, known[id]);
        else missing.push(id);
    }
    if (missing.length > 0) {
        try {
            const page = await listHotels({ page: 1, size: 100 });
            const found: { roomId: number; hotelId: number }[] = [];
            for (const hotel of page.result ?? []) {
                for (const room of hotel.rooms ?? []) {
                    if (missing.includes(room.id)) found.push({ roomId: room.id, hotelId: hotel.id });
                }
            }
            rememberHotels(found);
            found.forEach((f) => out.set(f.roomId, f.hotelId));
        } catch {
            // không dò được thì thôi, các phòng đó tạm không hiện
        }
    }
    return out;
}

// Chạy sau khi có session: đẩy wishlist đã lưu ở máy (lúc chưa đăng nhập) lên
// tài khoản, rồi trả wishlist đầy đủ của tài khoản. Phòng đã có trên server
// thì không đẩy lại (backend không chống trùng).
export async function syncWishlistOnLogin(localItems: WishlistItem[]): Promise<WishlistItem[]> {
    rememberHotels(localItems);
    let roomIds = await fetchServerRoomIds();
    const toPush = localItems.filter((it) => !roomIds.includes(it.roomId));
    if (toPush.length > 0) {
        await Promise.allSettled(toPush.map((it) => addServerRoom(it.roomId)));
        roomIds = await fetchServerRoomIds();
    }
    clearWishlist();
    const hotelOf = await resolveHotelIds(roomIds);
    const addedAt = Date.now();
    return roomIds
        .filter((id) => hotelOf.has(id))
        .map((id) => ({ roomId: id, hotelId: hotelOf.get(id)!, addedAt }));
}
