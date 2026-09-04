"use client";

import { unwrapResponse } from "./envelope";
import type { Amenity, Hotel, Paginated, Review, Room, RoomType, View } from "./types";

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/public/${path}`, { cache: "no-store" });
  return unwrapResponse<T>(res);
}

export interface ListHotelsParams {
  page?: number;
  size?: number;
  query?: string;
  // Lọc theo ward.province.id / ward.id (turkraft filter, id giờ là mã hành
  // chính VN thật — string, phải bọc nháy đơn trong câu filter).
  provinceId?: string | null;
  wardId?: string | null;
}

export function listHotels({ page = 1, size = 20, query, provinceId, wardId }: ListHotelsParams = {}) {
  const clauses: string[] = [];
  if (query?.trim()) clauses.push(`name~'*${query.trim()}*'`);
  if (wardId) clauses.push(`ward.id : '${wardId}'`);
  else if (provinceId) clauses.push(`ward.province.id : '${provinceId}'`);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (clauses.length) params.set("filter", clauses.join(" and "));
  return publicGet<Paginated<Hotel>>(`hotels?${params.toString()}`);
}

export const getHotel = (id: number) => publicGet<Hotel>(`hotels/${id}`);
export const getRoom = (id: number) => publicGet<Room>(`rooms/${id}`);
export const listAmenities = () => publicGet<Amenity[]>("amenity");
export const listViews = () => publicGet<View[]>("view");
export const getRoomType = (id: number) => publicGet<RoomType>(`roomtype/${id}`);
export const listHotelReviews = (hotelId: number) => publicGet<Review[]>(`hotels/${hotelId}/reviews`);
export const listRoomReviews = (roomId: number) => publicGet<Review[]>(`rooms/${roomId}/reviews`);

export { PublicApiError } from "./envelope";
