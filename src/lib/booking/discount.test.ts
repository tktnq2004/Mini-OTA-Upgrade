import { describe, expect, it } from "vitest";
import { formatDiscountBadge, quoteRoom, quoteStay, stayNights, type RoomDiscount } from "./discount";

const autumn: RoomDiscount = { id: 7, name: "Mùa thu", discountValue: 20, discountUnit: "PERCENT", startDate: "2026-11-01", endDate: "2026-11-30" };
const fixed: RoomDiscount = { id: 8, name: "Giảm 300k", discountValue: 300_000, discountUnit: "FIXED_AMOUNT", startDate: "2026-10-30", endDate: "2026-11-01" };
const huge: RoomDiscount = { id: 9, name: "Free", discountValue: 5_000_000, discountUnit: "FIXED_AMOUNT", startDate: "2026-12-24", endDate: "2026-12-24" };
const room = { price: 1_000_000, discounts: [autumn, fixed, huge] };
const applied = (q: ReturnType<typeof quoteRoom>) => q.applied.map((a) => [a.discount.id, a.nights, a.amount]);

describe("stayNights", () => {
    it("liệt kê các đêm [checkIn, checkOut), không tính ngày trả phòng", () => {
        expect(stayNights("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    });
    it("qua tháng 2 năm nhuận", () => {
        expect(stayNights("2028-02-28", "2028-03-01")).toHaveLength(2);
    });
    it("thiếu ngày hoặc ngày trả <= ngày nhận -> rỗng", () => {
        expect(stayNights("", "2026-11-02")).toEqual([]);
        expect(stayNights("2026-11-02", "2026-11-02")).toEqual([]);
    });
});

describe("quoteRoom", () => {
    it("mỗi đêm chỉ áp discount giảm nhiều tiền nhất", () => {
        const q = quoteRoom(room, "2026-10-28", "2026-11-02");
        expect([q.nights, q.subtotal, q.discountAmount, q.total]).toEqual([5, 5_000_000, 900_000, 4_100_000]);
        expect(applied(q)).toEqual([[8, 3, 900_000]]);
    });
    it("các đêm khác nhau áp các discount khác nhau, sắp theo số tiền giảm", () => {
        expect(applied(quoteRoom(room, "2026-11-01", "2026-11-04"))).toEqual([
            [7, 2, 400_000],
            [8, 1, 300_000],
        ]);
    });
    it("hoà số tiền -> startDate sớm hơn, rồi id nhỏ hơn", () => {
        const later = { ...autumn, id: 3, startDate: "2026-11-02" };
        expect(quoteRoom({ price: 1_000_000, discounts: [autumn, later] }, "2026-11-05", "2026-11-06").applied[0].discount.id).toBe(7);
        const sameStart = { ...autumn, id: 3 };
        expect(quoteRoom({ price: 1_000_000, discounts: [autumn, sameStart] }, "2026-11-05", "2026-11-06").applied[0].discount.id).toBe(3);
    });
    it("giảm cố định lớn hơn giá phòng -> đêm đó 0đ, không âm", () => {
        expect(quoteRoom(room, "2026-12-24", "2026-12-25").total).toBe(0);
    });
    it("endDate là đêm cuối được giảm (bao gồm)", () => {
        expect(quoteRoom(room, "2026-11-30", "2026-12-02").discountAmount).toBe(200_000);
    });
    it("làm tròn HALF_UP về đồng", () => {
        const q = quoteRoom({ price: 333_333, discounts: [{ ...autumn, discountValue: 15 }] }, "2026-11-05", "2026-11-06");
        expect(q.discountAmount).toBe(50_000); // 49.999,95
    });
    it("phòng không có discounts (backend cũ) -> giá gốc", () => {
        expect(quoteRoom({ price: 500 }, "2026-11-01", "2026-11-03").total).toBe(1000);
    });
});

describe("formatDiscountBadge", () => {
    it("phần trăm và số tiền", () => {
        expect(formatDiscountBadge(autumn)).toBe("-20%");
        expect(formatDiscountBadge(fixed)).toBe("-300.000 ₫");
    });
});

describe("quoteStay", () => {
    it("cộng dồn nhiều phòng cùng kỳ ở", () => {
        const q = quoteStay([room, { price: 500_000 }], "2026-11-01", "2026-11-03");
        expect([q.subtotal, q.discountTotal, q.total]).toEqual([3_000_000, 500_000, 2_500_000]);
        expect(q.rooms.map((r) => r.quote?.total)).toEqual([1_500_000, 1_000_000]);
    });
    it("chưa đủ ngày / ngày ngược -> quote null, tổng 0", () => {
        for (const [ci, co] of [[null, "2026-11-03"], ["2026-11-03", "2026-11-03"]] as const) {
            const q = quoteStay([room], ci, co);
            expect(q.rooms[0].quote).toBeNull();
            expect(q.total).toBe(0);
        }
    });
});
