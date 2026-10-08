import type { Hotel } from "@/lib/hotels/types";
import { provinces } from "@/data/locations.data";

export interface JourneyHotel {
    id: number;
    name: string;
    image: string;
    address: string;
    price: number;
}

export interface JourneyDestination {
    id: string;
    name: string;
    /** null = dữ liệu dự phòng, không có số thật để hiện. */
    hotelCount: number | null;
}

// Số pin trên bản đồ minh hoạ (khớp số toạ độ PIN_POSITIONS ở MapScreen).
export const PIN_COUNT = 5;

// Khách sạn mẫu khi API chưa trả dữ liệu (backend lỗi/trống) — để section không bao giờ rỗng.
// Ảnh dùng picsum có seed cố định giống thẻ điểm đến ở trang chủ.
const DEMO_HOTELS: JourneyHotel[] = [
    { id: 0, name: "WenGo Riverside Hotel", address: "Sơn Trà, Đà Nẵng", price: 850_000 },
    { id: 0, name: "Lotus Boutique Stay", address: "Hải Châu, Đà Nẵng", price: 1_150_000 },
    { id: 0, name: "Seabreeze Residence", address: "Ngũ Hành Sơn, Đà Nẵng", price: 1_480_000 },
    { id: 0, name: "Han Bridge Suites", address: "Hải Châu, Đà Nẵng", price: 1_920_000 },
    { id: 0, name: "Golden Bay Resort", address: "Sơn Trà, Đà Nẵng", price: 2_650_000 },
].map((h, i) => ({ ...h, id: -(i + 1), image: `https://picsum.photos/seed/wengo-journey-${i}/480/360` }));

/** Tối đa PIN_COUNT khách sạn có giá, rẻ nhất trước — hoặc bộ mẫu nếu thiếu dữ liệu thật. */
export function pickHotels(hotels: Hotel[]): { list: JourneyHotel[]; isDemo: boolean } {
    const seen = new Set<number>();
    const real = hotels
        .filter((h): h is Hotel & { averagePrice: number } => h.averagePrice !== null && !!h.image)
        .filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)))
        .sort((a, b) => a.averagePrice - b.averagePrice)
        .slice(0, PIN_COUNT)
        .map((h) => ({ id: h.id, name: h.name, image: h.image, address: h.address, price: Math.round(h.averagePrice) }));
    return real.length >= 3 ? { list: real, isDemo: false } : { list: DEMO_HOTELS, isDemo: true };
}

export function pickDestinations(destinations: { id: string; name: string; hotelCount: number }[]): JourneyDestination[] {
    const real = destinations.filter((d) => d.hotelCount > 0).slice(0, 4);
    if (real.length >= 2) return real;
    return provinces.slice(0, 4).map((p) => ({ id: p.id, name: p.name, hotelCount: null }));
}
