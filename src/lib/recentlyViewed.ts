import type { Hotel } from "./hotels/types";

// "Khách sạn đã xem gần đây" ở trang chủ — lưu một bản chụp NHỎ, GỌN của khách sạn ngay lúc
// khách xem (không chỉ lưu id rồi gọi lại API ở trang chủ) để trang chủ hiện được ngay, không
// cần thêm request. Chấp nhận đánh đổi: nếu khách sạn đổi ảnh/giá sau đó, bản chụp có thể hơi
// cũ tới lần xem tiếp theo — chỉ dùng cho gợi ý ở trang chủ, không dùng ở nơi cần dữ liệu mới
// nhất. Cùng quy ước lưu trữ với wishlistStorage.ts (localStorage, khoá "MiniOTA-...", nuốt lỗi
// khi bị chặn/đầy bộ nhớ).
export interface RecentlyViewedHotel {
  id: number;
  name: string;
  image: string;
  address: string;
  averagePrice: number | null;
  viewedAt: number;
}

const STORAGE_KEY = "MiniOTA-recently-viewed";
const MAX_ITEMS = 8;

export function loadRecentlyViewed(): RecentlyViewedHotel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Gọi khi khách MỞ trang chi tiết một khách sạn. Đưa lên đầu danh sách (dù đã xem trước đó),
// giới hạn MAX_ITEMS mục gần nhất.
export function rememberHotelView(hotel: Hotel): void {
  try {
    const current = loadRecentlyViewed().filter((h) => h.id !== hotel.id);
    const next: RecentlyViewedHotel = {
      id: hotel.id,
      name: hotel.name,
      image: hotel.image,
      address: hotel.address,
      averagePrice: hotel.averagePrice,
      viewedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...current].slice(0, MAX_ITEMS)));
  } catch {
    // localStorage đầy hoặc bị chặn (ẩn danh) — bỏ qua, không phải tính năng cốt lõi.
  }
}
