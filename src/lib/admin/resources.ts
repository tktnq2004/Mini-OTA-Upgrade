import { adminDelete, adminFetch, adminGet, adminPost, adminPut } from "./apiClient";
import type {
  Amenity,
  AppUser,
  CurrentAdmin,
  Discount,
  DiscountInput,
  Hotel,
  HotelInput,
  Paginated,
  Permission,
  Role,
  RoleInput,
  Room,
  RoomInput,
  RoomType,
  RoomUpdateInput,
  UserInput,
  View,
} from "./types";

export interface ListParams {
  page?: number;
  size?: number;
  query?: string;
}

function buildListQuery({ page = 1, size = 10, query }: ListParams, searchField: string): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (query?.trim()) params.set("filter", `${searchField}~'*${query.trim()}*'`);
  return params.toString();
}

// ---- Hotels ----
// Địa chỉ nhập vào chỉ là phần "số nhà, tên đường" — backend tự nối thêm
// ", <tên phường>, <tên tỉnh>" vào address khi lưu (HotelService.create),
// nên address trả về sau khi tạo/sửa sẽ khác address bạn gõ.
export interface HotelListParams extends ListParams {
  // Lọc theo ward.province.id / ward.id — đã test thật bằng curl, backend
  // dùng turkraft/spring-filter nên field lồng nhau lọc được thẳng qua dấu
  // chấm, không cần endpoint riêng. wardId ưu tiên hơn provinceId (chọn ward
  // rồi thì không cần gửi cả hai — ward id đã tự suy ra đúng tỉnh).
  provinceId?: number | null;
  wardId?: number | null;
}
export const listHotels = ({ page = 1, size = 10, query, provinceId, wardId }: HotelListParams = {}) => {
  const clauses: string[] = [];
  if (query?.trim()) clauses.push(`name~'*${query.trim()}*'`);
  if (wardId) clauses.push(`ward.id : ${wardId}`);
  else if (provinceId) clauses.push(`ward.province.id : ${provinceId}`);
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (clauses.length) params.set("filter", clauses.join(" and "));
  return adminGet<Paginated<Hotel>>(`hotels?${params.toString()}`);
};
export const getHotel = (id: number) => adminGet<Hotel>(`hotels/${id}`);
export const createHotel = (input: HotelInput) => adminPost<Hotel>("hotels", input);
export const updateHotel = (id: number, input: HotelInput) => adminPut<Hotel>("hotels", { id, ...input });
export const deleteHotel = (id: number) => adminDelete<void>(`hotels/${id}`);

// ---- Provinces / Wards (chỉ trả về TÊN, không có id — xem ADMIN.md) ----
export const listProvinceNames = () => adminGet<string[]>("provinces");
export const listWardNamesByProvinceId = (provinceId: number) =>
  adminGet<string[]>(`wards/provinces/${provinceId}`);

// ---- Rooms (quản lý lồng trong khách sạn) ----
// discount_id không bắt buộc theo ReqCreateRoomDTO (không @NotNull), nhưng
// RoomService.create_room lại gọi discountRepository.findAllById(discount_id)
// KHÔNG kiểm tra null trước — nếu không gửi field này, Spring Data ném
// InvalidDataAccessApiUsageException ("Ids must not be null") và tạo phòng
// luôn thất bại. Đây là bug xác nhận thật ở backend (đã test bằng curl) —
// phải luôn gửi mảng rỗng để né, dù field này hiện không dùng vào việc gì.
export const createRoom = (input: RoomInput) => {
  const { roomTypeId, ...rest } = input;
  return adminPost<Room>("rooms", { ...rest, roomType: { id: roomTypeId }, discount_id: [] });
};
export const getRoom = (id: number) => adminGet<Room>(`rooms/${id}`);
export const updateRoom = (input: RoomUpdateInput) => adminPut<Room>("rooms", input);
export const deleteRoom = (id: number) => adminDelete<void>(`rooms/${id}`);
export const removeRoomAmenity = (roomId: number, amenityId: number) =>
  adminFetch<Room>("relationships", {
    method: "DELETE",
    body: JSON.stringify({ room_id: roomId, amenities_id: [amenityId], viewIds: [] }),
  });
export const removeRoomView = (roomId: number, viewId: number) =>
  adminFetch<Room>("relationships", {
    method: "DELETE",
    body: JSON.stringify({ room_id: roomId, amenities_id: [], viewIds: [viewId] }),
  });

// ---- Room types (không có endpoint list-all, chỉ tra theo id) ----
export const getRoomType = (id: number) => adminGet<RoomType>(`roomtype/${id}`);
export const createRoomType = (roomTypeName: string) => adminPost<RoomType>("roomtype", { roomTypeName });
export const updateRoomType = (id: number, roomTypeName: string) =>
  adminPut<RoomType>("roomtype", { roomTypeId: id, roomTypeName });
export const deleteRoomType = (id: number) => adminDelete<void>(`roomtype/${id}`);

// ---- Amenities ----
// Xoá amenity trả về List<Room> (các phòng bị ảnh hưởng) chứ không phải
// void — bỏ qua nội dung trả về, chỉ cần biết đã xoá xong.
export const listAmenities = () => adminGet<Amenity[]>("amenity");
export const createAmenity = (name: string, icon: string) => adminPost<Amenity>("amenity", { name, icon });
export const updateAmenity = (id: number, name: string, icon: string) =>
  adminPut<Amenity>("amenity", { id, name, icon });
export const deleteAmenity = (id: number) => adminDelete<unknown>(`amenity/${id}`).then(() => undefined);

// ---- Views ----
export const listViews = () => adminGet<View[]>("view");
export const createView = (name: string, icon: string) => adminPost<View>("view", { name, icon });
export const updateView = (id: number, name: string, icon: string) =>
  adminPut<View>("view", { id, name, icon });
export const deleteView = (id: number) => adminDelete<unknown>(`view/${id}`).then(() => undefined);

// ---- Users ----
export const listUsers = (params: ListParams = {}) =>
  adminGet<Paginated<AppUser>>(`users?${buildListQuery(params, "email")}`);
export const getUser = (id: number) => adminGet<AppUser>(`users/${id}`);
export const createUser = (input: UserInput) => adminPost<AppUser>("users", input);
export const updateUser = (id: number, input: UserInput) => adminPut<AppUser>("users", { id, ...input });
export const deleteUser = (id: number) => adminDelete<void>(`users/${id}`);
// Quyền THẬT của user nằm ở đây — role trong ReqCreateUserDTO/ReqUpdateUserDTO
// ở trên chỉ là field trưng bày, không cấp quyền gì cả (xem ADMIN.md mục Roles).
export const assignUserRoles = (userId: number, roleIds: number[]) =>
  adminPost<unknown>(`users/${userId}/roles`, { roleIds });

// ---- Discounts ----
// Discount giờ chỉ là "định nghĩa" (giá trị + đơn vị %/tiền cố định), KHÔNG
// còn ngày bắt đầu/kết thúc — ngày áp dụng gắn theo từng phòng riêng (xem
// attachDiscountToRoom). 1 discount có thể gắn vào nhiều phòng với khung
// ngày khác nhau.
export const listDiscounts = () => adminGet<Discount[]>("discounts");
export const getDiscount = (id: number) => adminGet<Discount>(`discounts/${id}`);
export const createDiscount = (input: DiscountInput) => adminPost<Discount>("discounts", input);
export const updateDiscount = (id: number, input: Partial<DiscountInput>) =>
  adminPut<Discount>("discounts", { id, ...input });
export const deleteDiscount = (id: number) => adminDelete<void>(`discounts/${id}`);
export const attachDiscountToRoom = (roomId: number, discountId: number, startDate: string, endDate: string) =>
  adminPost<Room>(`room/${roomId}/discounts`, [{ discountId, startDate, endDate }]);
// Backend hiện KHÔNG thật sự gỡ (no-op đã xác nhận trong DiscountService.delete_arr_room)
// — vẫn gọi đúng API cho khớp hợp đồng, nhưng đừng tin kết quả là đã gỡ.
export const detachDiscountFromRoom = (roomId: number, discountIds: number[]) =>
  adminFetch<void>("discounts", { method: "DELETE", body: JSON.stringify({ roomId, discountId: discountIds }) });

// ---- Roles & Permissions ----
// GET /permissions là stub lúc nào cũng trả null (bug backend) nên không có
// cách nào liệt kê toàn bộ permission qua API riêng — lấy gián tiếp bằng
// cách gộp permissions của mọi role đang có (ROLE_ADMIN mặc định có đủ hết).
export const listRoles = () => adminGet<Role[]>("roles");
export const getRole = (id: number) => adminGet<Role>(`roles/${id}`);
export const createRole = (input: RoleInput) => adminPost<Role>("roles", input);
export const deleteRole = (id: number) => adminDelete<void>(`roles/${id}`);
export const replaceRolePermissions = (id: number, permissionIds: number[]) =>
  adminPut<Role>(`roles/${id}/permissions`, { permissionIds });

// ---- Danh tính + quyền của chính user đang đăng nhập ----
// Xem CurrentAdmin trong types.ts — đang giả định endpoint này, chưa có
// thật ở backend.
export const getMyAccess = () => adminGet<CurrentAdmin>("auth/me");

export function derivePermissionCatalog(roles: Role[]): Permission[] {
  const byId = new Map<number, Permission>();
  for (const role of roles) {
    for (const permission of role.permissions ?? []) {
      byId.set(permission.id, permission);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.module.localeCompare(b.module) || a.id - b.id);
}
