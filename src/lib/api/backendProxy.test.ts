import { describe, expect, it, vi } from "vitest";
import { errorMessageFrom } from "./envelope";
import { backendUnavailable } from "./backendProxy";

describe("backendUnavailable", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    it("không kết nối được -> 502 + envelope đọc được câu báo lỗi", async () => {
        const res = backendUnavailable(new TypeError("fetch failed"), "GET hotels");
        expect(res.status).toBe(502);
        const body = await res.json();
        expect(body.statuscode).toBe(502);
        expect(errorMessageFrom(body, "")).toMatch(/Không kết nối được/);
    });
    it("quá thời gian chờ -> 504", async () => {
        const err = new DOMException("The operation was aborted due to timeout", "TimeoutError");
        const res = backendUnavailable(err, "GET hotels");
        expect(res.status).toBe(504);
        expect(errorMessageFrom(await res.json(), "")).toMatch(/quá lâu/);
    });
});
