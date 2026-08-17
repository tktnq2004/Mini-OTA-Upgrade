import rawUnits from "./vn-provinces-wards.json";

export interface Province {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

export interface Ward {
  id: string;
  provinceId: string;
  name: string;
  fullName: string;
}

interface RawWard {
  Code: string;
  FullName: string;
  ProvinceCode: string;
}

interface RawProvince {
  Code: string;
  FullName: string;
  Wards: RawWard[];
}

const RAW = rawUnits as RawProvince[];

const PROVINCE_NAME_PREFIXES = ["Thành phố ", "Tỉnh "];
const WARD_NAME_PREFIXES = ["Phường ", "Xã ", "Thị trấn ", "Đặc khu "];

function stripPrefix(fullName: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (fullName.startsWith(prefix)) return fullName.slice(prefix.length);
  }
  return fullName;
}

const PROVINCE_CENTERS: Record<string, [number, number]> = {
  "01": [21.03, 105.85], // Hà Nội
  "04": [22.665, 106.258], // Cao Bằng
  "08": [21.823, 105.214], // Tuyên Quang (+ Hà Giang)
  "11": [21.386, 103.023], // Điện Biên
  "12": [22.396, 103.47], // Lai Châu
  "14": [21.328, 103.914], // Sơn La
  "15": [22.336, 103.844], // Lào Cai (+ Yên Bái)
  "19": [21.594, 105.848], // Thái Nguyên (+ Bắc Kạn)
  "20": [21.853, 106.761], // Lạng Sơn
  "22": [20.959, 107.073], // Quảng Ninh
  "24": [21.186, 106.076], // Bắc Ninh (+ Bắc Giang)
  "25": [21.268, 105.23], // Phú Thọ (+ Vĩnh Phúc, Hoà Bình)
  "31": [20.865, 106.683], // Hải Phòng (+ Hải Dương)
  "33": [20.85, 106.02], // Hưng Yên (+ Thái Bình)
  "37": [20.25, 105.975], // Ninh Bình (+ Hà Nam, Nam Định)
  "38": [19.807, 105.777], // Thanh Hoá
  "40": [18.679, 105.681], // Nghệ An
  "42": [18.341, 105.905], // Hà Tĩnh
  "44": [16.75, 107.2], // Quảng Trị (+ Quảng Bình)
  "46": [16.463, 107.585], // Huế
  "48": [16.047, 108.206], // Đà Nẵng (+ Quảng Nam)
  "51": [15.12, 108.8], // Quảng Ngãi (+ Kon Tum)
  "52": [13.983, 108.0], // Gia Lai (+ Bình Định)
  "56": [12.238, 109.196], // Khánh Hoà (+ Ninh Thuận)
  "66": [12.667, 108.05], // Đắk Lắk (+ Phú Yên)
  "68": [11.94, 108.458], // Lâm Đồng (+ Đắk Nông, Bình Thuận)
  "75": [10.957, 106.842], // Đồng Nai
  "79": [10.78, 106.7], // Hồ Chí Minh (+ Bà Rịa - Vũng Tàu, Bình Dương)
  "80": [11.31, 106.1], // Tây Ninh (+ Long An)
  "82": [10.458, 105.633], // Đồng Tháp (+ Tiền Giang)
  "86": [10.253, 105.972], // Vĩnh Long (+ Bến Tre, Trà Vinh)
  "91": [10.021, 105.081], // An Giang (+ Kiên Giang)
  "92": [10.045, 105.746], // Cần Thơ (+ Sóc Trăng, Hậu Giang)
  "96": [9.176, 105.15], // Cà Mau (+ Bạc Liêu)
};

export const provinces: Province[] = RAW.map((p) => {
  const [lat, lng] = PROVINCE_CENTERS[p.Code] ?? [16.0, 106.0];
  return {
    id: p.Code,
    name: stripPrefix(p.FullName, PROVINCE_NAME_PREFIXES),
    fullName: p.FullName,
    lat,
    lng,
  };
});

export const wards: Ward[] = RAW.flatMap((p) =>
  p.Wards.map((w) => ({
    id: w.Code,
    provinceId: w.ProvinceCode,
    name: stripPrefix(w.FullName, WARD_NAME_PREFIXES),
    fullName: w.FullName,
  }))
);

export function getWardsByProvince(provinceId: string | undefined | null): Ward[] {
  if (!provinceId) return [];
  return wards.filter((w) => w.provinceId === provinceId);
}

export function getProvinceById(id: string | undefined | null): Province | undefined {
  if (!id) return undefined;
  return provinces.find((p) => p.id === id);
}

export function getWardById(id: string | undefined | null): Ward | undefined {
  if (!id) return undefined;
  return wards.find((w) => w.id === id);
}

