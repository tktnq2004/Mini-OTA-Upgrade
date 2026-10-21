import type { Discount, DiscountInput } from "@/lib/admin/types";

export const NAME_MAX = 50;

export const EMPTY_FORM: DiscountInput = {
    hotelId: null,
    name: "",
    discountValue: 10,
    discountUnit: "PERCENT",
    startDate: "",
    endDate: "",
    roomIds: [],
    active: true,
};

export type DiscountStatus = "running" | "upcoming" | "ended" | "paused";

export const STATUS_LABEL: Record<DiscountStatus, string> = {
    running: "Đang chạy",
    upcoming: "Sắp diễn ra",
    ended: "Đã kết thúc",
    paused: "Tạm tắt",
};

// today: yyyy-mm-dd. startDate/endDate là đêm đầu/đêm cuối được giảm (bao gồm).
export function statusOf(d: Pick<Discount, "active" | "startDate" | "endDate">, today: string): DiscountStatus {
    if (!d.active) return "paused";
    if (d.endDate < today) return "ended";
    if (d.startDate > today) return "upcoming";
    return "running";
}

export function toInput(d: Discount): DiscountInput {
    return {
        hotelId: d.hotelId,
        name: d.name,
        discountValue: d.discountValue,
        discountUnit: d.discountUnit,
        startDate: d.startDate,
        endDate: d.endDate,
        roomIds: d.roomIds,
        active: d.active,
    };
}

interface ValidateOptions {
    scopeAll: boolean;
    isEditing: boolean;
    needHotel: boolean;
    today: string;
}

// Cùng quy tắc với backend (docs/DISCOUNT_API.md mục 3.6) — chặn sớm ở FE cho
// nhanh, backend vẫn kiểm lại và thông báo lỗi của backend được hiện nguyên văn.
export function validate(form: DiscountInput, { scopeAll, isEditing, needHotel, today }: ValidateOptions): string | null {
    if (needHotel && !form.hotelId) return "Chọn khách sạn áp dụng";
    const name = form.name.trim();
    if (!name) return "Nhập tên tag khuyến mãi";
    if (name.length > NAME_MAX) return `Tên tag tối đa ${NAME_MAX} ký tự`;
    if (!form.discountValue || form.discountValue <= 0) return "Giá trị giảm phải lớn hơn 0";
    if (form.discountUnit === "PERCENT" && form.discountValue >= 100) return "Phần trăm giảm phải nhỏ hơn 100";
    if (form.discountUnit === "FIXED_AMOUNT" && !Number.isInteger(form.discountValue)) return "Số tiền giảm phải là số nguyên (VNĐ)";
    if (!form.startDate || !form.endDate) return "Chọn đủ đêm bắt đầu và đêm kết thúc";
    if (form.startDate > form.endDate) return "Đêm bắt đầu phải trước hoặc trùng đêm kết thúc";
    if (!isEditing && form.endDate < today) return "Đêm kết thúc không được ở quá khứ";
    if (!scopeAll && form.roomIds.length === 0) return "Chọn ít nhất 1 phòng, hoặc áp dụng cho tất cả phòng";
    return null;
}
