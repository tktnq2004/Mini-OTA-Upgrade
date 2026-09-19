// Type khớp response thật của backend Mini-OTA cho các API đọc công khai
// (GET /hotels, /rooms/{id}, /amenity, /view...) — thay cho dữ liệu mock cũ
// ở src/data/hotels.data.ts / rooms.data.ts (đã xoá).

export interface Province {
  id: string;
  name: string;
}

export interface Ward {
  id: string;
  name: string;
  province: Province;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
}

export interface View {
  id: number;
  name: string;
  icon: string;
}

export interface RoomType {
  id: number;
  roomTypeName: string;
}

export interface RoomImage {
  id: number;
  image: string;
}

// Room không có field diện tích (sizeSqm) hay "view" — backend không có cột
// tương ứng / @JsonIgnore field views (xem ADMIN.md mục Giới hạn UX). Room
// KHÔNG bao giờ chứa `hotel` (JsonIgnore) — id khách sạn phải lấy từ context
// gọi (route param, hoặc từ Hotel.rooms[].id lúc đang duyệt theo hotel).
export interface Room {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
  capacity: number;
  allowSmoking: boolean;
  allowPets: boolean;
  cancellationPolicy: boolean;
  description: string;
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
}

export interface Hotel {
  id: number;
  name: string;
  address: string;
  image: string;
  latitude: string;
  longitude: string;
  ward: Ward;
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

export interface Meta {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  meta: Meta;
  result: T[];
}
