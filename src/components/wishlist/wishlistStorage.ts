// Wishlist = danh sách phòng đã lưu để cân nhắc đặt sau. CHỈ chứa tham chiếu
// phòng + khách sạn — KHÔNG có ngày nhận/trả, KHÔNG có số khách, KHÔNG có số
// lượng. Ngày & số khách được chọn ở màn đặt phòng (/checkout), không phải ở
// đây (xem bàn bạc thiết kế: wishlist thuần room + hotel).
//
// Hiện lưu ở localStorage vì phía khách hàng chưa gắn session thật vào wishlist.
// TODO(backend): khi có API wishlist thật (entity Wishlist: user + room):
//   1. Đổi load/save/clear bên dưới thành gọi API cho người đã đăng nhập:
//        GET    /api/public/wishlist            -> WishlistItem[]
//        POST   /api/public/wishlist            body { roomId }        (thêm)
//        DELETE /api/public/wishlist/{roomId}                          (xoá)
//      (proxy /api/public hiện chỉ cho GET — backend cần mở POST/DELETE +
//       đọc cookie session ở proxy route). WishlistProvider không phải đổi gì
//       vì chỉ gọi qua các hàm ở file này.
//   2. Gọi mergeWishlistOnLogin() ngay sau đăng nhập/đăng ký (đã có sẵn chỗ
//      gọi trong AccountProvider) để đẩy wishlist lưu tạm ở máy lên tài khoản.

export interface WishlistItem {
    hotelId: number;
    roomId: number;
    addedAt: number;
}

const STORAGE_KEY = "MiniOTA-wishlist";
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

// TODO(backend): gọi POST /api/public/wishlist/merge (body: localItems) sau khi
// đăng nhập/đăng ký thành công, rồi clearWishlist() nếu API xác nhận đã gộp.
// Thân hàm hiện chỉ log.
export async function mergeWishlistOnLogin(localItems: WishlistItem[]): Promise<void> {
    if (localItems.length === 0) return;
    console.log("[wishlist] TODO: gộp wishlist cục bộ vào tài khoản sau khi đăng nhập", localItems);
}
