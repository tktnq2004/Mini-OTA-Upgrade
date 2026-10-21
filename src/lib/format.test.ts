import { describe, expect, it } from "vitest";
import { formatCompactVnd, formatVnd, parseServerDateTime } from "./format";

const iso = (ms: number) => new Date(ms).toISOString();

describe("parseServerDateTime", () => {
    // vitest.config chạy ở TZ America/New_York — kết quả phải theo giờ VN (+07:00).
    it("đang chạy ở múi giờ khác Việt Nam (không thì các test dưới không chứng minh được gì)", () => {
        expect(new Date("2026-11-15T00:00:00").getTimezoneOffset()).not.toBe(-420);
    });
    it("LocalDateTime không múi giờ = giờ Việt Nam, cắt phần lẻ giây dài", () => {
        expect(iso(parseServerDateTime("2026-11-15T15:53:11.169122"))).toBe("2026-11-15T08:53:11.169Z");
        expect(iso(parseServerDateTime("2026-10-22T00:52:28.0100598"))).toBe("2026-10-21T17:52:28.010Z");
        expect(iso(parseServerDateTime("2026-11-15T15:53:11"))).toBe("2026-11-15T08:53:11.000Z");
    });
    it("chuỗi đã có múi giờ thì giữ nguyên", () => {
        expect(iso(parseServerDateTime("2026-11-15T08:53:11.169Z"))).toBe("2026-11-15T08:53:11.169Z");
        expect(iso(parseServerDateTime("2026-11-15T15:53:11+07:00"))).toBe("2026-11-15T08:53:11.000Z");
    });
    it("rỗng / không hợp lệ -> NaN", () => {
        expect(parseServerDateTime(null)).toBeNaN();
        expect(parseServerDateTime(undefined)).toBeNaN();
        expect(parseServerDateTime("abc")).toBeNaN();
    });
});

describe("formatVnd / formatCompactVnd", () => {
    it("định dạng đầy đủ", () => {
        expect(formatVnd(1_650_000)).toBe("1.650.000 ₫");
    });
    it("rút gọn cho marker bản đồ", () => {
        expect(formatCompactVnd(30_000)).toBe("30k vnđ");
        expect(formatCompactVnd(1_500_000)).toBe("1,5Tr vnđ");
    });
});
