import type { Amenity, HotelBase, LegacyRole, RoomBase, RoomImage, View } from "@/lib/api/types";

// Kiểu dùng chung với phía khách — khai báo ở lib/api/types.ts.
export type {
  Amenity,
  BackendEnvelope,
  LegacyRole,
  Meta,
  Paginated,
  Province,
  RoomImage,
  RoomType,
  View,
  Ward,
} from "@/lib/api/types";

export interface AdminSessionUser {
  id: number;
  email: string;
  name: string;
}

// Hotel trả về từ GET /hotels, /hotels/{id} (ResHotelDTo) — không có field audit.
// Hotel trả về từ POST/PUT /hotels là entity thô, CÓ thêm field audit.
// Gộp chung 1 interface, các field audit để optional cho khớp cả 2 trường hợp.
export interface Hotel extends HotelBase {
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
  wardId: string;
}

// Room trả về từ API admin KHÔNG chứa hotel/roomType/views (@JsonIgnore bên
// Java) — dù 3 field đó là bắt buộc lúc tạo. Không có cách nào đọc lại từ
// API, phải tự nhớ hoặc tra qua hotel.rooms.
export interface Room extends RoomBase {
  createdAt?: string;
  updatedAt?: string;
  images?: RoomImage[];
  amenities?: Amenity[];
  // Hướng nhìn đang gắn — backend mới trả field này (trước đây @JsonIgnore).
  views?: View[];
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

// fullName/username/phone vẫn khai báo nullable vì tài khoản seed/tạo qua
// đường khác (Google OAuth...) có thể thiếu các field này. hotelId: 0 = admin
// toàn hệ thống, khác 0 = owner/staff của đúng hotel đó, null = customer/chưa gán.
export interface AppUser {
  id: number;
  email: string;
  fullName: string | null;
  username: string | null;
  phone: string | null;
  role: LegacyRole;
  // Vai trò THẬT (khác field "role" ở trên — chỉ cosmetic, không cấp quyền
  // gì). User↔Role giờ là 1-nhiều thật (1 user chỉ 1 role) — trả phẳng
  // id+tên thay vì object Role lồng Permission, đủ để hiển thị cột "Vai trò"
  // và preselect dropdown gán role. null = chưa được gán role nào (mọi
  // customer thường, mặc định).
  roleId?: number | null;
  roleName?: string | null;
  hotelId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// Không còn field "role" (LegacyRole) — field đó bên backend chỉ cosmetic,
// không cấp quyền gì (xem ADMIN.md mục 6). Quyền thật gán qua field roleId
// dưới đây, cùng cơ chế với trang Phân quyền.
//
// password: bắt buộc lúc TẠO mới; lúc SỬA (updateUser -> PUT
// /admin/users/{id}, UserService.update_All) để trống nghĩa là "giữ nguyên
// mật khẩu cũ" — backend không còn bắt admin xác thực lại/nhập password để
// sửa người khác (đó chỉ áp dụng cho USER tự sửa hồ sơ mình, USER_UPDATE_OWN).
export interface UserInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  // Backend nhận field này ở cả POST /users (ReqCreateUserDTO) lẫn PUT
  // /admin/users/{id} (ReqUpdateAllLocalDTO). null = không gán khách sạn
  // (customer). 0 (hotel "Hệ thống") bị backend chặn tường minh — chỉ
  // StartupRunner được gán cho admin gốc, API này không cho gán 0 cho user
  // khác. Lúc SỬA: null nghĩa là giữ nguyên hotel hiện tại, chưa hỗ trợ bỏ
  // gán về customer qua form này (cùng quy ước với các field khác của
  // ReqUpdateAllLocalDTO).
  hotelId: number | null;
  // Role THẬT (khác field "role" ở trên). Lúc SỬA: gửi thẳng trong cùng
  // request PUT /admin/users/{id} (ReqUpdateAllLocalDTO.roleId) — backend chặn gán role
  // có level <= level người gọi. Lúc TẠO: KHÔNG được gửi qua POST /users
  // (ReqCreateUserDTO không có field này) vì endpoint đó public/không xác
  // thực — cho phép gán role tuỳ ý ở đây sẽ là lỗ hổng tự nâng quyền qua
  // trang đăng ký công khai. Field này chỉ có ý nghĩa lúc SỬA; FE tự gọi
  // thêm 1 lời gọi update ngay sau khi tạo nếu có chọn role (xem
  // UsersPage.handleSubmit).
  roleId: number | null;
}

export type DiscountUnit = "PERCENT" | "FIXED_AMOUNT";

// Khuyến mãi 1 lớp, quản lý theo từng hotel (docs/DISCOUNT_API.md mục 2).
// startDate/endDate: đêm đầu / đêm CUỐI được giảm (bao gồm cả 2 đầu).
// roomIds rỗng = áp dụng mọi phòng của hotel (kể cả phòng thêm sau).
export interface Discount {
  id: number;
  hotelId: number;
  hotelName?: string | null;
  name: string;
  discountValue: number;
  discountUnit: DiscountUnit;
  startDate: string;
  endDate: string;
  active: boolean;
  roomIds: number[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Body POST /discounts và PUT /discounts/{id}. hotelId: admin hệ thống
// (hotelId = 0) bắt buộc chọn; owner/staff gửi hotel của chính mình, backend
// tự ép về hotel người gọi. Lúc sửa backend bỏ qua hotelId (không đổi hotel).
export interface DiscountInput {
  hotelId: number | null;
  name: string;
  discountValue: number;
  discountUnit: DiscountUnit;
  startDate: string;
  endDate: string;
  roomIds: number[];
  active: boolean;
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

// GET /auth/me — danh tính + role/permission THẬT của chính người đang đăng
// nhập (đã có thật ở backend, xem session.ts:fetchMe). hotelId: 0 = admin
// toàn hệ thống (quản lý tất cả hotel), khác 0 = owner/staff của đúng hotel
// đó, null = customer (không được vào /admin — xem probeAdminAccess).
// role: số ít (không phải mảng nữa) — User↔Role backend giờ là 1-nhiều thật,
// 1 user chỉ 1 role; null = chưa được gán role nào.
export interface CurrentAdmin {
  id: number;
  email: string;
  name: string;
  hotelId: number | null;
  role: Role | null;
}
