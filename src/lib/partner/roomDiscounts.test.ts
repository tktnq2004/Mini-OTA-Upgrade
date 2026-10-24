import { describe, expect, it } from "vitest";
import type { Discount } from "@/lib/admin/types";
import { discountsForRoom } from "./roomDiscounts";

const base: Discount = {
    id: 1,
    hotelId: 2,
    name: "Mùa thu",
    discountValue: 10,
    discountUnit: "PERCENT",
    startDate: "2026-10-01",
    endDate: "2026-11-30",
    active: true,
    roomIds: [],
};
const today = "2026-10-24";

describe("discountsForRoom", () => {
    it("roomIds rỗng -> áp cho mọi phòng", () => expect(discountsForRoom([base], 14, today)).toHaveLength(1));
    it("chỉ áp cho phòng có trong roomIds", () => {
        const d = { ...base, roomIds: [15] };
        expect(discountsForRoom([d], 14, today)).toHaveLength(0);
        expect(discountsForRoom([d], 15, today)).toHaveLength(1);
    });
    it("bỏ khuyến mãi đang tắt hoặc đã kết thúc", () => {
        expect(discountsForRoom([{ ...base, active: false }], 14, today)).toHaveLength(0);
        expect(discountsForRoom([{ ...base, endDate: "2026-10-23" }], 14, today)).toHaveLength(0);
    });
    it("vẫn tính khuyến mãi sắp bắt đầu và khuyến mãi kết thúc đúng hôm nay", () => {
        expect(discountsForRoom([{ ...base, startDate: "2026-12-01", endDate: "2026-12-31" }], 14, today)).toHaveLength(1);
        expect(discountsForRoom([{ ...base, endDate: today }], 14, today)).toHaveLength(1);
    });
});
