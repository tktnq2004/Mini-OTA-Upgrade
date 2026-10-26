// Kiểu dữ liệu backend dùng chung cho cả 3 phía (khách, tài khoản, admin).
// lib/hotels/types.ts và lib/admin/types.ts re-export lại từ đây và chỉ khai
// báo thêm phần riêng của mình — sửa field chung thì sửa 1 chỗ này.

// Envelope RestResponse<T> mà backend bọc quanh MỌI response JSON (xem
// util/FormatResponse.java). Các apiClient tự bóc "data" ra (lib/api/envelope),
// code còn lại không cần biết tới lớp bọc này.
export interface BackendEnvelope<T> {
  statuscode: number;
  error: string | string[] | null;
  message: string;
  data: T;
}

export interface Meta {
  current: number;
  pageSize: number;
  totalPages: number;
  total: number;
}

export interface Paginated<T> {
  meta: Meta;
  result: T[];
}

// role ở đây chỉ còn ý nghĩa hiển thị — quyền thật do bảng Role/Permission
// quyết định. GUEST: khách vãng lai đã xác minh email bằng OTP
// (docs/GUEST_BOOKING_API.md) — FE dùng để ẩn hồ sơ/thẻ đã lưu.
export type LegacyRole = "ADMIN" | "CUSTOMER" | "GUEST";

// id là mã hành chính VN thật (string, vd. "01"/"00070"), khớp
// src/data/vn-provinces-wards.json — cùng 1 nguồn id cho cả FE lẫn BE.
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

// Loại phòng của 1 khách sạn (mỗi hotel tự định nghĩa — docs/ROOM_TYPE_API.md).
// Giữ mọi thứ chung của các phòng cùng loại: sức chứa, chính sách, tiện nghi,
// hướng nhìn. Phòng chỉ còn tên/số phòng, giá, mô tả, ảnh.
export interface RoomType {
  id: number;
  hotelId: number;
  roomTypeName: string;
  capacity: number;
  allowSmoking: boolean;
  allowPets: boolean;
  cancellationPolicy: boolean;
  amenities: Amenity[];
  views: View[];
}

export interface RoomImage {
  id: number;
  image: string;
}

// Phần chung của Room ở mọi response. Room không chứa `hotel` (@JsonIgnore bên
// Java) — id khách sạn lấy từ context gọi hoặc roomType.hotelId. Sức chứa,
// chính sách, tiện nghi, hướng nhìn nằm trong roomType.
export interface RoomBase {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
  description: string;
  // null chỉ với dữ liệu cũ chưa gán loại — phòng tạo mới bắt buộc có loại.
  roomType: RoomType | null;
}

// Phần chung của Hotel ở mọi response.
export interface HotelBase {
  id: number;
  name: string;
  address: string;
  image: string;
  latitude: string;
  longitude: string;
  ward: Ward;
}
