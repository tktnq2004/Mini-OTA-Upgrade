import { describe, expect, it } from "vitest";
import { expandRanges, isRangeBookable, mergeAvailability } from "./availability";

describe("expandRanges", () => {
    it("bung thành từng đêm, không tính ngày trả phòng", () => {
        expect(expandRanges([{ startDate: "2026-10-30", endDate: "2026-11-02" }])).toEqual([
            "2026-10-30",
            "2026-10-31",
            "2026-11-01",
        ]);
    });
    it("khoảng rỗng -> không có đêm nào", () => {
        expect(expandRanges([{ startDate: "2026-11-02", endDate: "2026-11-02" }])).toEqual([]);
    });
});

describe("mergeAvailability", () => {
    it("hợp các đêm kín, giao cửa sổ đặt phòng", () => {
        const a = mergeAvailability([
            { minDate: "2026-11-01", maxDate: "2026-12-31", unavailableRanges: [{ startDate: "2026-11-05", endDate: "2026-11-07" }] },
            { minDate: "2026-11-03", maxDate: "2026-12-15", unavailableRanges: [{ startDate: "2026-11-06", endDate: "2026-11-08" }] },
        ]);
        expect(a.minDate).toBe("2026-11-03");
        expect(a.maxDate).toBe("2026-12-15");
        expect([...a.disabledDates].sort()).toEqual(["2026-11-05", "2026-11-06", "2026-11-07"]);
    });
});

describe("isRangeBookable", () => {
    const a = { disabledDates: ["2026-11-05"], minDate: "2026-11-01", maxDate: "2026-11-30" };
    it("trống trong cửa sổ -> được (trả phòng đúng ngày kín vẫn được)", () => {
        expect(isRangeBookable("2026-11-02", "2026-11-05", a)).toBe(true);
    });
    it("chứa đêm đã kín -> không", () => {
        expect(isRangeBookable("2026-11-04", "2026-11-06", a)).toBe(false);
    });
    it("ngoài cửa sổ / thiếu ngày / không có đêm nào -> không", () => {
        expect(isRangeBookable("2026-10-30", "2026-11-02", a)).toBe(false);
        expect(isRangeBookable("2026-11-29", "2026-12-01", a)).toBe(false);
        expect(isRangeBookable(null, "2026-11-02", a)).toBe(false);
        expect(isRangeBookable("2026-11-03", "2026-11-03", a)).toBe(false);
    });
});
