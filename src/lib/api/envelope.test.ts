import { describe, expect, it } from "vitest";
import { errorMessageFrom, readEnvelope, unwrapEnvelope } from "./envelope";

describe("unwrapEnvelope", () => {
    it("bóc data khỏi envelope backend", () => {
        expect(unwrapEnvelope({ statuscode: 200, error: null, message: "ok", data: { id: 1 } })).toEqual({ id: 1 });
    });
    it("response không bọc thì trả nguyên", () => {
        expect(unwrapEnvelope([1, 2])).toEqual([1, 2]);
        expect(unwrapEnvelope({ data: 1 })).toEqual({ data: 1 }); // thiếu statuscode -> không phải envelope
    });
});

describe("errorMessageFrom", () => {
    it("error dạng mảng thì nối lại", () => {
        expect(errorMessageFrom({ error: ["Phone is required", "Username is required"] }, "x")).toBe(
            "Phone is required, Username is required",
        );
    });
    it("ưu tiên error, rồi message, rồi fallback", () => {
        expect(errorMessageFrom({ error: "A", message: "B" }, "C")).toBe("A");
        expect(errorMessageFrom({ error: null, message: "B" }, "C")).toBe("B");
        expect(errorMessageFrom(null, "C")).toBe("C");
    });
});

describe("readEnvelope", () => {
    it("204 -> undefined, không phải JSON -> null, JSON hỏng -> null", async () => {
        expect(await readEnvelope(new Response(null, { status: 204 }))).toBeUndefined();
        expect(await readEnvelope(new Response("OK", { headers: { "content-type": "text/plain" } }))).toBeNull();
        expect(await readEnvelope(new Response("{oops", { headers: { "content-type": "application/json" } }))).toBeNull();
    });
    it("JSON hợp lệ", async () => {
        const res = new Response(JSON.stringify({ data: 1, statuscode: 200 }), { headers: { "content-type": "application/json" } });
        expect(await readEnvelope(res)).toEqual({ data: 1, statuscode: 200 });
    });
});
