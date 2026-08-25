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

// Envelope RestResponse<T> mà backend bọc quanh MỌI response thành công
// (và phần lớn response lỗi) — xem util/FormatResponse.java. apiClient.ts
// tự bóc "data" ra, code còn lại trong app không cần biết tới envelope này.
export interface BackendEnvelope<T> {
  statuscode: number;
  error: string | string[] | null;
  message: string;
  data: T;
}

// role ở đây chỉ còn ý nghĩa hiển thị — quyền thật do bảng Role/Permission
// (mục Roles) quyết định, JWT không còn mang role/permission nào cả.
export type LegacyRole = "ADMIN" | "CUSTOMER";

export interface AdminSessionUser {
  id: number;
  email: string;
  name: string;
}

export interface Province {
  id: number;
  name: string;
}

export interface Ward {
  id: number;
  name: string;
  province: Province;
}

// Hotel trả về từ GET /hotels, /hotels/{id} (ResHotelDTo) — không có field audit.
// Hotel trả về từ POST/PUT /hotels là entity thô, CÓ thêm field audit.
// Gộp chung 1 interface, các field audit để optional cho khớp cả 2 trường hợp.
export interface Hotel {
  id: number;
  name: string;
  address: string;
  image: string;
  latitude: string;
  longitude: string;
  ward: Ward;
  rooms?: Room[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface HotelInput {
  name: string;
  address: string;
  image: string;
  latitude: string;
  longitude: string;
  wardId: number;
}

export interface RoomImage {
  id: number;
  image: string;
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

export interface DiscountDetail {
  id: number;
  startDate: string;
  endDate: string;
  discounts: Discount;
}

// Room response KHÔNG bao giờ chứa hotel/roomType/views (đều @JsonIgnore bên
// Java) — dù 3 field đó là bắt buộc lúc tạo. Không có cách nào đọc lại từ
// API, phải tự nhớ hoặc tra qua hotel.rooms.
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
  createdAt?: string;
  updatedAt?: string;
  images?: RoomImage[];
  amenities?: Amenity[];
  discountDetails?: DiscountDetail[];
}

export interface RoomInput {
  hotelId: number;
  name: string;
  price: number;
  capacity: number;
  allowSmoking: boolean;
  allowPets: boolean;
  cancellationPolicy: boolean;
  thumbnail: string;
  description: string;
  roomTypeId: number;
  amenities_id: number[];
  viewIds: number[];
}

export interface RoomUpdateInput {
  roomId: number;
  name: string;
  price: number;
  capacity: number;
  thumbnail: string;
  allowSmoking: boolean;
  allowPets: boolean;
  cancellationPolicy: boolean;
  description: string;
  amenities_id: number[];
  viewIds: number[];
}

// id/fullName/username/phone khai báo nullable vì backend thật sự trả null
// cho các field này trong một số trường hợp (xem ADMIN.md mục 6 — GET /users
// danh sách luôn trả id: null; fullName/username/phone cũng có thể null với
// tài khoản seed/tạo qua đường khác).
export interface AppUser {
  id: number | null;
  email: string;
  fullName: string | null;
  username: string | null;
  phone: string | null;
  role: LegacyRole;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// Không còn field "role" (LegacyRole) — field đó bên backend chỉ cosmetic,
// không cấp quyền gì (xem ADMIN.md mục 6). Quyền thật gán qua danh sách Role
// thật (roleIds) ở đây, cùng cơ chế với trang Phân quyền.
export interface UserInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
}

export type DiscountUnit = "PERCENT" | "FIXED_AMOUNT";

export interface Discount {
  id: number;
  discountValue: number;
  unit: DiscountUnit;
}

export interface DiscountInput {
  discountValue: number;
  discountUnit: DiscountUnit;
}

export interface Permission {
  id: number;
  permissionName: string;
  module: string;
}

export interface Role {
  id: number;
  roleName: string;
  description: string | null;
  active: boolean;
  level: number;
  permissions: Permission[];
}

export interface RoleInput {
  roleName: string;
  description: string;
  level: number;
  permissionIds: number[];
}
