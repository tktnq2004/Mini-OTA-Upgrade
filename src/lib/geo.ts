// Tiện ích toạ độ dùng cho lọc bản đồ (bán kính quanh vị trí GPS, kiểm tra
// điểm có nằm trong khung nhìn bản đồ hay không).

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface BoundsBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function isInsideBounds(lat: number, lng: number, bounds: BoundsBox): boolean {
  return (
    lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north
  );
}
