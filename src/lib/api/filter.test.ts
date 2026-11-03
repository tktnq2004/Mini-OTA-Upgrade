import { describe, expect, it } from "vitest";
import { escapeFilterValue } from "./filter";

describe("escapeFilterValue", () => {
    it("giữ nguyên chữ thường và bỏ khoảng trắng 2 đầu", () => expect(escapeFilterValue("  Đà Lạt ")).toBe("Đà Lạt"));
    it("escape dấu nháy đơn", () => expect(escapeFilterValue("BL's")).toBe("BL\\'s"));
    it("bỏ dấu gạch chéo ngược", () => expect(escapeFilterValue("a\\b")).toBe("ab"));
});
