import raw from "@/data/admin-locations.json";

// Backend KHÔNG có API trả tỉnh/ward kèm id (GET /provinces, GET
// /wards/provinces/{id} chỉ trả tên — xem ADMIN.md mục 7), nên không thể
// dựng dropdown chọn ward bằng cách gọi API như thường lệ. Danh sách này là
// SNAPSHOT thật lấy trực tiếp từ DB (bảng provinces/wards) tại thời điểm
// seed — id ở đây CHÍNH LÀ id thật backend đang dùng, không phải suy đoán.
//
// Nếu backend seed lại (id sẽ đổi vì AUTO_INCREMENT không reset khi DELETE,
// chỉ TRUNCATE mới reset) thì cần export lại file này bằng cách query thẳng
// MySQL: SELECT id, name FROM provinces; SELECT id, name, province_id FROM wards;
export interface AdminProvince {
    id: number;
    name: string;
}

export interface AdminWard {
    id: number;
    name: string;
    provinceId: number;
}

const data = raw as { provinces: AdminProvince[]; wards: AdminWard[] };

export const adminProvinces: AdminProvince[] = data.provinces;
export const adminWards: AdminWard[] = data.wards;

export function getAdminWardsByProvince(provinceId: number | null): AdminWard[] {
    if (!provinceId) return [];
    return adminWards.filter((w) => w.provinceId === provinceId);
}

export function getAdminWardById(wardId: number | null | undefined): AdminWard | undefined {
    if (!wardId) return undefined;
    return adminWards.find((w) => w.id === wardId);
}

export function getAdminProvinceById(provinceId: number | null | undefined): AdminProvince | undefined {
    if (!provinceId) return undefined;
    return adminProvinces.find((p) => p.id === provinceId);
}
