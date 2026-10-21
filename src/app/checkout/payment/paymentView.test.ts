import { describe, expect, it } from "vitest";
import { viewStateOf } from "./bookingViewState";
import { formatCountdown } from "./HoldCountdown";

describe("viewStateOf", () => {
    it("trạng thái booking -> màn hình", () => {
        expect(viewStateOf("Completed")).toBe("success");
        expect(viewStateOf("Cancelled")).toBe("cancelled");
        expect(viewStateOf("REFUND_PENDING")).toBe("refund");
        expect(viewStateOf("REFUNDED")).toBe("refund");
        expect(viewStateOf("PROCESSING")).toBe("processing");
    });
    it("Pending -> undefined, để nơi gọi tự quyết", () => {
        expect(viewStateOf("Pending")).toBeUndefined();
    });
});

describe("formatCountdown", () => {
    it("phút:giây", () => {
        expect(formatCountdown(14 * 60_000 + 5_000)).toBe("14:05");
        expect(formatCountdown(0)).toBe("0:00");
        expect(formatCountdown(-5_000)).toBe("0:00");
    });
    it("giờ:phút:giây khi còn >= 1 giờ", () => {
        expect(formatCountdown(26 * 3_600_000 + 14 * 60_000 + 5_000)).toBe("26:14:05");
    });
});
