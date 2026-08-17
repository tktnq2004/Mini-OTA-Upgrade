import { adminDelete, adminFetch, adminGet, adminPost, adminPut } from "./apiClient";
import type {
  Amenity,
  AppUser,
  Discount,
  DiscountInput,
  Hotel,
  HotelInput,
  Paginated,
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
export const listHotels = (params: ListParams = {}) =>
  adminGet<Paginated<Hotel>>(`hotels?${buildListQuery(params, "name")}`);
export const getHotel = (id: number) => adminGet<Hotel>(`hotels/${id}`);
export const createHotel = (input: HotelInput) =>
  adminPost<Hotel>("hotels", { ...input, province: { id: input.provinceId } });
export const updateHotel = (id: number, input: HotelInput) =>
  adminPut<Hotel>("hotels", { id, ...input });
export const deleteHotel = (id: number) => adminDelete<void>(`hotels/${id}`);

// ---- Rooms (managed inside a hotel) ----
export const createRoom = (input: RoomInput) =>
  adminPost<Room>("rooms", { ...input, roomType: { id: input.roomTypeId } });
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
export const createRoomType = (roomTypeName: string) =>
  adminPost<RoomType>("roomtype", { roomTypeName });
export const updateRoomType = (id: number, roomTypeName: string) =>
  adminPut<RoomType>("roomtype", { roomTypeId: id, roomTypeName });
export const deleteRoomType = (id: number) => adminDelete<void>(`roomtype/${id}`);

// ---- Amenities ----
export const listAmenities = () => adminGet<Amenity[]>("amenity");
export const createAmenity = (name: string, icon: string) =>
  adminPost<Amenity>("amenity", { name, icon });
export const updateAmenity = (id: number, name: string, icon: string) =>
  adminPut<Amenity>("amenity", { id, name, icon });
export const deleteAmenity = (id: number) => adminDelete<void>(`amenity/${id}`);

// ---- Views ----
export const listViews = () => adminGet<View[]>("view");
export const createView = (name: string, icon: string) => adminPost<View>("view", { name, icon });
export const updateView = (id: number, name: string, icon: string) =>
  adminPut<View>("view", { id, name, icon });
export const deleteView = (id: number) => adminDelete<void>(`view/${id}`);

// ---- Users ----
export const listUsers = (params: ListParams = {}) =>
  adminGet<Paginated<AppUser>>(`users?${buildListQuery(params, "email")}`);
export const getUser = (id: number) => adminGet<AppUser>(`users/${id}`);
export const createUser = (input: UserInput) => adminPost<AppUser>("users", input);
export const updateUser = (id: number, input: UserInput) => adminPut<AppUser>("users", { id, ...input });
export const deleteUser = (id: number) => adminDelete<void>(`users/${id}`);

// ---- Discounts ----
export const listDiscounts = () => adminGet<Discount[]>("discounts");
export const getDiscount = (id: number) => adminGet<Discount>(`discounts/${id}`);
export const createDiscount = (input: DiscountInput) => adminPost<Discount>("discounts", input);
export const updateDiscount = (id: number, input: Partial<DiscountInput>) =>
  adminPut<Discount>("discounts", { id, ...input });
export const deleteDiscount = (id: number) => adminDelete<void>(`discounts/${id}`);
export const assignDiscountToRoom = (roomId: number, discountId: number) =>
  adminPost<void>("discount-detail", { roomId, discountId });
export const removeDiscountFromRoom = (roomId: number, discountId: number) =>
  adminFetch<void>("discount-detail", { method: "DELETE", body: JSON.stringify({ roomId, discountId }) });
