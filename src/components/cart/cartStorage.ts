// Giỏ phòng (chọn nhiều phòng để đặt cùng lúc). Hiện chỉ lưu ở localStorage vì
// phía khách hàng chưa có session đăng nhập thật. Khi có backend + session thật:
//   1. Đổi loadCartFromStorage/saveCartToStorage bên dưới thành gọi API
//      (GET/PUT /me/cart) cho người đã đăng nhập — CartProvider không cần đổi gì,
//      vì nó chỉ gọi qua các hàm này.
//   2. Gọi mergeCartOnLogin() ngay sau khi đăng nhập/đăng ký thành công (xem TODO
//      trong src/app/login/page.tsx và src/app/signup/page.tsx) để gộp giỏ đang
//      lưu tạm ở máy khách vào giỏ đã có trong DB của tài khoản đó.

export interface CartItem {
    hotelId: number;
    roomId: number;
    quantity: number;
    checkin: string; // yyyy-mm-dd, chụp lại tại thời điểm thêm vào giỏ
    checkout: string;
    guests: number;
    addedAt: number;
}

const STORAGE_KEY = "MiniOTA-cart";

export function loadCartFromStorage(): CartItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCartToStorage(items: CartItem[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // localStorage đầy hoặc bị chặn (chế độ ẩn danh) — bỏ qua, giỏ vẫn
        // hoạt động trong phiên hiện tại, chỉ không lưu được qua lần tải lại.
    }
}

export function clearCartStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// TODO(backend): gọi hàm này ngay sau khi đăng nhập/đăng ký thành công.
// Thân hàm hiện chỉ log — thay bằng POST /me/cart/merge (gửi localItems) rồi
// clearCartStorage() nếu API xác nhận đã gộp xong.
export async function mergeCartOnLogin(localItems: CartItem[]): Promise<void> {
    if (localItems.length === 0) return;
    console.log("[cart] TODO: merge giỏ phòng cục bộ vào tài khoản sau khi đăng nhập", localItems);
}
