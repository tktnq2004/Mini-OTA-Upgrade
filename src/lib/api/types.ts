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
// quyết định, JWT không mang role/permission nào.
export type LegacyRole = "ADMIN" | "CUSTOMER";

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

export interface RoomType {
  id: number;
  roomTypeName: string;
}

export interface RoomImage {
  id: number;
  image: string;
}

// Phần chung của Room ở mọi response. Room KHÔNG bao giờ chứa `hotel` hay
// `views` (@JsonIgnore bên Java) — id khách sạn phải lấy từ context gọi.
export interface RoomBase {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
  capacity: number;
  allowSmoking: boolean;
  allowPets: boolean;
  cancellationPolicy: boolean;
  description: string;
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
