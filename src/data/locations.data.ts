// Mock địa giới hành chính (tỉnh/thành -> xã/phường) dùng cho bộ lọc tìm kiếm.
// Toạ độ province là tâm khu vực, dùng để bay bản đồ tới khi người dùng đổi bộ lọc.

export interface Province {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface Ward {
  id: string;
  provinceId: number;
  name: string;
}

interface ProvinceSeed extends Province {
  wards: string[];
}

const SEED: ProvinceSeed[] = [
  {
    id: 29,
    name: "Hà Nội",
    lat: 21.03,
    lng: 105.85,
    wards: ["Phường Hoàn Kiếm", "Phường Ba Đình", "Phường Đống Đa", "Phường Cầu Giấy", "Phường Tây Hồ"],
  },
  {
    id: 50,
    name: "Hồ Chí Minh",
    lat: 10.78,
    lng: 106.7,
    wards: ["Phường Sài Gòn", "Phường Bến Thành", "Phường Bến Nghé", "Phường Tân Định", "Phường Thủ Đức"],
  },
  {
    id: 43,
    name: "Đà Nẵng",
    lat: 16.04,
    lng: 108.22,
    wards: ["Phường Hải Châu", "Phường Thanh Khê", "Phường Sơn Trà", "Phường Ngũ Hành Sơn"],
  },
  {
    id: 92,
    name: "Hội An",
    lat: 15.88,
    lng: 108.33,
    wards: ["Phường Hội An", "Phường Cẩm Châu", "Phường Cẩm An", "Phường Thanh Hà"],
  },
  {
    id: 75,
    name: "Huế",
    lat: 16.466,
    lng: 107.585,
    wards: ["Phường Thuận Hóa", "Phường Phú Hội", "Phường Vỹ Dạ", "Phường Kim Long"],
  },
  {
    id: 79,
    name: "Nha Trang",
    lat: 12.24,
    lng: 109.19,
    wards: ["Phường Nha Trang", "Phường Vĩnh Hải", "Phường Phương Sài", "Phường Cam Ranh"],
  },
  {
    id: 49,
    name: "Đà Lạt",
    lat: 11.94,
    lng: 108.44,
    wards: ["Phường Đà Lạt", "Phường Xuân Hương", "Phường Trại Mát", "Phường Cam Ly"],
  },
  {
    id: 68,
    name: "Phú Quốc",
    lat: 10.22,
    lng: 103.97,
    wards: ["Phường Dương Đông", "Phường An Thới", "Xã Gành Dầu", "Xã Hàm Ninh"],
  },
  {
    id: 65,
    name: "Cần Thơ",
    lat: 10.0167,
    lng: 105.7833,
    wards: ["Phường Ninh Kiều", "Phường Cái Răng", "Phường Bình Thủy", "Phường Ô Môn"],
  },
  {
    id: 72,
    name: "Bà Rịa - Vũng Tàu",
    lat: 10.35,
    lng: 107.08,
    wards: ["Phường Vũng Tàu", "Phường Bãi Trước", "Phường Long Hải", "Xã Xuyên Mộc"],
  },
  {
    id: 85,
    name: "Ninh Thuận",
    lat: 11.7167,
    lng: 109.1833,
    wards: ["Phường Phan Rang", "Phường Đông Hải", "Xã Vĩnh Hải", "Xã Ninh Chữ"],
  },
  {
    id: 28,
    name: "Hòa Bình",
    lat: 20.6667,
    lng: 105.0667,
    wards: ["Phường Hòa Bình", "Xã Mai Châu", "Xã Tân Lạc", "Xã Cao Phong"],
  },
  {
    id: 24,
    name: "Sa Pa",
    lat: 22.336,
    lng: 103.84,
    wards: ["Phường Sa Pa", "Xã Tả Van", "Xã Tả Phìn", "Xã Bản Khoang"],
  },
];

export const provinces: Province[] = SEED.map(({ id, name, lat, lng }) => ({ id, name, lat, lng }));

export const wards: Ward[] = SEED.flatMap((province) =>
  province.wards.map((name, index) => ({
    id: `${province.id}-${index}`,
    provinceId: province.id,
    name,
  }))
);

export function getWardsByProvince(provinceId: number | string | undefined | null): Ward[] {
  if (provinceId === undefined || provinceId === null || provinceId === "") return [];
  const pid = Number(provinceId);
  return wards.filter((w) => w.provinceId === pid);
}

export function getProvinceById(id: number | string | undefined | null): Province | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  const pid = Number(id);
  return provinces.find((p) => p.id === pid);
}

export function getWardById(id: string | undefined | null): Ward | undefined {
  if (!id) return undefined;
  return wards.find((w) => w.id === id);
}

// Vài cityId trong dữ liệu hotel trỏ tới cùng một địa phương (dữ liệu seed cũ) —
// gộp chúng lại về một provinceId chuẩn trước khi lọc theo tỉnh.
const CITY_ID_ALIASES: Record<number, number> = {
  94: 24,
};

export function normalizeCityId(cityId: number): number {
  return CITY_ID_ALIASES[cityId] ?? cityId;
}
