// Mock danh sách phòng theo hotelId — sinh có seed (deterministic) để UI ổn định
// giữa server/client, sau này thay bằng API backend thật.

export const ROOM_TYPES = ["standard", "superior", "deluxe", "suite", "family", "twin"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  standard: "Standard",
  superior: "Superior",
  deluxe: "Deluxe",
  suite: "Suite",
  family: "Phòng Gia đình",
  twin: "Twin",
};

const PRICE_RANGE_VND: Record<RoomType, [number, number]> = {
  standard: [500_000, 900_000],
  superior: [800_000, 1_300_000],
  twin: [700_000, 1_100_000],
  deluxe: [1_200_000, 2_200_000],
  family: [1_500_000, 2_800_000],
  suite: [2_500_000, 5_000_000],
};

const CAPACITY_RANGE: Record<RoomType, [number, number]> = {
  standard: [2, 2],
  superior: [2, 2],
  twin: [2, 2],
  deluxe: [2, 3],
  family: [4, 6],
  suite: [2, 4],
};

const SIZE_RANGE_SQM: Record<RoomType, [number, number]> = {
  standard: [20, 26],
  superior: [24, 30],
  twin: [24, 30],
  deluxe: [30, 42],
  family: [42, 58],
  suite: [50, 75],
};

const DESCRIPTORS = [
  "Hướng biển",
  "Hướng phố",
  "Hướng núi",
  "Hướng vườn",
  "Ban công riêng",
  "Tầng cao",
  "Góc yên tĩnh",
  "Gần hồ bơi",
];

export const AMENITIES = [
  "Wifi miễn phí",
  "Điều hòa nhiệt độ",
  "TV màn hình phẳng",
  "Minibar",
  "Bồn tắm",
  "Vòi sen đứng",
  "Ban công riêng",
  "View biển",
  "View thành phố",
  "Máy pha cà phê",
  "Két an toàn",
  "Bàn làm việc",
  "Dịch vụ phòng 24/7",
  "Không hút thuốc",
] as const;

export interface Room {
  id: string;
  hotelId: number;
  name: string;
  roomType: RoomType;
  thumbnail: string;
  capacity: number;
  sizeSqm: number;
  price: number;
  amenities: string[];
}

// mulberry32 — seeded PRNG nhỏ gọn, cho kết quả giống nhau mỗi lần gọi với cùng seed
function mulberry32(seed: number) {
  let t = seed;
  return function random() {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function inRange(rng: () => number, [min, max]: [number, number], step = 1): number {
  const value = min + rng() * (max - min);
  return Math.round(value / step) * step;
}

function shuffled<T>(rng: () => number, items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const roomsCache = new Map<number, Room[]>();

export function generateRoomsForHotel(hotelId: number, count = 13): Room[] {
  const cached = roomsCache.get(hotelId);
  if (cached) return cached;

  const rng = mulberry32(hotelId * 9301 + 49297);
  const rooms: Room[] = [];

  for (let i = 0; i < count; i++) {
    const roomType = pick(rng, ROOM_TYPES);
    const descriptor = pick(rng, DESCRIPTORS);
    const price = inRange(rng, PRICE_RANGE_VND[roomType], 10_000);
    const capacity = inRange(rng, CAPACITY_RANGE[roomType]);
    const sizeSqm = inRange(rng, SIZE_RANGE_SQM[roomType]);
    const amenityCount = 4 + Math.floor(rng() * 5);
    const amenities = Array.from(
      new Set(["Wifi miễn phí", ...shuffled(rng, AMENITIES).slice(0, amenityCount)])
    );

    rooms.push({
      id: `${hotelId}-r${i}`,
      hotelId,
      name: `${ROOM_TYPE_LABELS[roomType]} ${descriptor}`,
      roomType,
      thumbnail: `https://picsum.photos/seed/wengo-room-${hotelId}-${i}/640/420`,
      capacity,
      sizeSqm,
      price,
      amenities,
    });
  }

  roomsCache.set(hotelId, rooms);
  return rooms;
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

// Ảnh phòng đầu tiên luôn trùng thumbnail (để nhất quán với RoomCard), các ảnh
// sau sinh thêm bằng seed riêng — deterministic, không cần lưu thêm dữ liệu.
export function getRoomGallery(room: Room, count = 5): string[] {
  const images = [room.thumbnail];
  for (let i = 1; i < count; i++) {
    images.push(`https://picsum.photos/seed/wengo-room-${room.id}-g${i}/1200/800`);
  }
  return images;
}

// Mô tả sinh từ chính dữ liệu phòng — giữ tiếng Việt cố định giống các nội
// dung mock khác (tên phòng, tiện nghi...), không đi qua i18n.
export function getRoomDescription(room: Room): string {
  const highlight = room.amenities.slice(0, 3).join(", ");
  return `Phòng ${room.name} rộng ${room.sizeSqm} m², phù hợp cho tối đa ${room.capacity} khách. Không gian được thiết kế hiện đại, đầy đủ tiện nghi với ${highlight} cùng nhiều tiện ích khác đi kèm.`;
}
