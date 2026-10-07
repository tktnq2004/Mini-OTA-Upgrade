"use client";

import { publicGet } from "./apiClient";
import type { Amenity, Hotel, Paginated, Review, Room, RoomType, View } from "./types";

export interface ListHotelsParams {
  page?: number;
  size?: number;
  query?: string;
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
