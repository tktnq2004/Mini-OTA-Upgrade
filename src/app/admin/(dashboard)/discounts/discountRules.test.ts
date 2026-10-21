import { describe, expect, it } from "vitest";
import type { DiscountInput } from "@/lib/admin/types";
import { EMPTY_FORM, statusOf, validate } from "./discountRules";

const today = "2026-10-22";
const ok: DiscountInput = { ...EMPTY_FORM, hotelId: 2, name: "Mùa thu", startDate: "2026-11-01", endDate: "2026-11-30" };
const opts = { scopeAll: true, isEditing: false, needHotel: true, today };

describe("statusOf", () => {
    const base = { active: true, startDate: "2026-10-20", endDate: "2026-10-25" };
    it("tắt -> Tạm tắt, bất kể ngày", () => expect(statusOf({ ...base, active: false }, today)).toBe("paused"));
    it("đang trong khoảng (gồm 2 đầu) -> Đang chạy", () => {
        expect(statusOf(base, today)).toBe("running");
        expect(statusOf({ ...base, endDate: today }, today)).toBe("running");
    });
    it("chưa tới / đã qua", () => {
        expect(statusOf({ ...base, startDate: "2026-10-23" }, today)).toBe("upcoming");
        expect(statusOf({ ...base, endDate: "2026-10-21" }, today)).toBe("ended");
    });
});

describe("validate", () => {
    it("hợp lệ -> null", () => expect(validate(ok, opts)).toBeNull());
    it("admin hệ thống phải chọn khách sạn", () => {
        expect(validate({ ...ok, hotelId: null }, opts)).toMatch(/khách sạn/);
        expect(validate({ ...ok, hotelId: null }, { ...opts, needHotel: false })).toBeNull();
    });
    it("tên tag bắt buộc, tối đa 50 ký tự", () => {
        expect(validate({ ...ok, name: "   " }, opts)).toMatch(/tên tag/i);
        expect(validate({ ...ok, name: "x".repeat(51) }, opts)).toMatch(/50/);
    });
    it("giá trị giảm: % trong (0, 100), số tiền là số nguyên dương", () => {
        expect(validate({ ...ok, discountValue: 0 }, opts)).toMatch(/lớn hơn 0/);
        expect(validate({ ...ok, discountValue: 100 }, opts)).toMatch(/nhỏ hơn 100/);
        expect(validate({ ...ok, discountUnit: "FIXED_AMOUNT", discountValue: 1000.5 }, opts)).toMatch(/số nguyên/);
        expect(validate({ ...ok, discountUnit: "FIXED_AMOUNT", discountValue: 150_000 }, opts)).toBeNull();
    });
    it("ngày: đủ 2 đầu, không ngược, tạo mới không kết thúc ở quá khứ (sửa thì được)", () => {
        expect(validate({ ...ok, endDate: "" }, opts)).toMatch(/đủ đêm/);
        expect(validate({ ...ok, startDate: "2026-12-01" }, opts)).toMatch(/trước hoặc trùng/);
        const past = { ...ok, startDate: "2026-10-01", endDate: "2026-10-10" };
        expect(validate(past, opts)).toMatch(/quá khứ/);
        expect(validate(past, { ...opts, isEditing: true })).toBeNull();
    });
    it("chọn từng phòng thì phải có ít nhất 1 phòng", () => {
        expect(validate(ok, { ...opts, scopeAll: false })).toMatch(/ít nhất 1 phòng/);
        expect(validate({ ...ok, roomIds: [12] }, { ...opts, scopeAll: false })).toBeNull();
    });
});
