// Type khớp response thật của backend Mini-OTA cho các API đọc công khai
// (GET /hotels, /rooms/{id}, /amenity, /view...). Phần dùng chung với admin
// nằm ở lib/api/types.ts.

import type { RoomDiscount } from "@/lib/booking/discount";
import type { Amenity, HotelBase, RoomBase, RoomImage, RoomType } from "@/lib/api/types";

// Kiểu dùng chung với phía admin — khai báo ở lib/api/types.ts.
export type { Amenity, Meta, Paginated, Province, RoomImage, RoomType, View, Ward } from "@/lib/api/types";

// Room không có field diện tích (sizeSqm) hay "view" — backend không có cột
// tương ứng / @JsonIgnore field views (xem ADMIN.md mục Giới hạn UX).
export interface Room extends RoomBase {
  amenities: Amenity[];
  roomType: RoomType | null;
  images: RoomImage[];
  // Chỉ có ở GET /rooms/{id} (backend tính lại mỗi lần gọi): cửa sổ đặt phòng
  // [minDate, maxDate] và các khoảng đã có booking trong cửa sổ đó. endDate là
  // NGÀY TRẢ phòng của booking (ngày đó vẫn nhận khách mới) — xem
  // lib/booking/availability.ts.
  minDate?: string;
  maxDate?: string;
  unavailableRanges?: { startDate: string; endDate: string }[];
  // Khuyến mãi đang bật + chưa hết hạn của phòng này (docs/DISCOUNT_API.md
  // mục 4). Optional vì backend chưa trả field này — thiếu thì coi như không
  // có khuyến mãi. Giá sau giảm tính ở lib/booking/discount.ts.
  discounts?: RoomDiscount[];
}

export interface Hotel extends HotelBase {
  rooms?: Room[];
  // Giá phòng trung bình (VNĐ) — BE tự tính lại (AVG price mọi room của
  // hotel này) mỗi khi 1 room được thêm/sửa giá/xoá, không cho sửa tay.
  // null nếu hotel chưa có room nào (vd. nhóm "test hotel" seed) — không
  // hiện badge giá cho trường hợp này, xem formatCompactVnd/Map marker.
  averagePrice: number | null;
}

export interface ReviewAuthor {
  id: number;
  fullName: string;
  userName: string;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: ReviewAuthor;
}

