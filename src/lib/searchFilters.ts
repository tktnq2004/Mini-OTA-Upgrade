// Hợp đồng dữ liệu dùng chung cho bộ lọc tìm kiếm (Home -> Map -> Hotel),
// đi qua query string để các trang có thể đọc/ghi cùng một định dạng.

export interface SearchFilters {
  provinceId: string | null;
  wardId: string | null;
  checkin: string; // yyyy-mm-dd
  checkout: string; // yyyy-mm-dd
  guests: number;
}

interface ParamsLike {
  get(key: string): string | null;
}

// Luôn làm việc trên các trường giờ địa phương (getFullYear/getMonth/getDate)
// thay vì toISOString() (quy về UTC) — với múi giờ dương như Việt Nam
// (UTC+7), toISOString() có thể lùi lại một ngày và làm sai lệch checkin/checkout.
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function defaultFilters(): SearchFilters {
  const checkin = todayIso();
  return {
    provinceId: null,
    wardId: null,
    checkin,
    checkout: addDaysIso(checkin, 1),
    guests: 2,
  };
}

// Dùng khi ĐẶT PHÒNG một khách sạn cụ thể ("book now") — lúc này ngày nhận/trả
// và số khách mới thật sự cần thiết, nên mang đầy đủ cả 5 trường.
export function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.provinceId) params.set("province", String(filters.provinceId));
  if (filters.wardId) params.set("ward", filters.wardId);
  if (filters.checkin) params.set("checkin", filters.checkin);
  if (filters.checkout) params.set("checkout", filters.checkout);
  if (filters.guests) params.set("guests", String(filters.guests));
  return params;
}

// Dùng cho việc TÌM/LỌC khách sạn theo khu vực (Home -> Map, đổi tỉnh/xã trên
// Map) — chỉ tỉnh/xã mới quyết định kết quả tìm kiếm; ngày nhận/trả và số
// khách không phải tham số tìm kiếm, nên không đưa vào URL ở bước này. Chúng
// chỉ thật sự cần khi người dùng bấm đặt một khách sạn cụ thể (xem
// filtersToSearchParams ở trên).
export function locationSearchParams(filters: Pick<SearchFilters, "provinceId" | "wardId">): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.provinceId) params.set("province", String(filters.provinceId));
  if (filters.wardId) params.set("ward", filters.wardId);
  return params;
}

export function parseFilters(searchParams: ParamsLike): SearchFilters {
  const base = defaultFilters();
  const province = searchParams.get("province");
  const ward = searchParams.get("ward");
  const checkin = searchParams.get("checkin");
  const checkout = searchParams.get("checkout");
  const guests = searchParams.get("guests");

  return {
    provinceId: province || base.provinceId,
    wardId: ward || base.wardId,
    checkin: checkin || base.checkin,
    checkout: checkout || base.checkout,
    guests: guests ? Number(guests) : base.guests,
  };
}

export function formatDateVn(iso: string, locale: "vi" | "en" = "vi"): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  const intlLocale = locale === "en" ? "en-US" : "vi-VN";
  return d.toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function nightsBetween(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 1;
  const a = new Date(`${checkin}T00:00:00`).getTime();
  const b = new Date(`${checkout}T00:00:00`).getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}
