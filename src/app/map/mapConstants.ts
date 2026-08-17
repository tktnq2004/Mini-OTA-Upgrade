export const VIETNAM_CENTER: [number, number] = [106.7009, 10.7769];
export const VIETNAM_ZOOM = 12.5;
export const PROVINCE_ZOOM = 12;
export const WARD_ZOOM = 14;
export const NEARBY_ZOOM = 13;
export const NEARBY_RADIUS_KM = 10;

// Nếu người dùng vào thẳng /map mà không qua bộ lọc ở Home (không có
// ?province= trên URL), mặc định coi như đang tìm ở Hồ Chí Minh (mã "79").
export const DEFAULT_MAP_PROVINCE_ID = "79";

export const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/019fbdda-12e2-7c5a-966f-6c8de6b48a1c/style.json?key=nUt8ihyudipqInDJ8j6p`;
