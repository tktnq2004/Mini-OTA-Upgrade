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

export type Role = "ADMIN" | "CUSTOMER";

export interface AdminSessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface Region {
  id: number;
  name: string;
}

export interface Province {
  id: number;
  name: string;
  region?: Region | null;
}

export interface Hotel {
  id: number;
  name: string;
  address: string;
  image: string;
  latitude: string;
  longitude: string;
  province: Province;
  rooms?: Room[];
}

export interface HotelInput {
  name: string;
  address: string;
  image: string;
  latitude: string;
  longitude: string;
  provinceId: number;
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

export interface AppUser {
  id: number;
  email: string;
  fullName: string;
  username: string;
  phone: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface UserInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
}

export interface Discount {
  id: number;
  discountPercent: number;
  startDate: string;
  endDate: string;
}

export interface DiscountInput {
  discountPercent: number;
  startDate: string;
  endDate: string;
}
