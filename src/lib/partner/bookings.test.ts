import { describe, expect, it } from "vitest";
import { bookingTotal, matchesQuery, stageOf } from "./bookings";
import type { PartnerBooking } from "./types";

const base: PartnerBooking = {
    bookingId: 42,
    checkIn: "2026-10-24",
    checkOut: "2026-10-27",
    paymentStatus: "Completed",
    paymentProvider: "STRIPE",
    expirationTime: null,
    bookingDate: "2026-10-20T10:00:00",
    totalAmount: 4_500_000,
    rooms: [
        { roomId: 1, roomName: "Deluxe", pricePerNight: 1_000_000 },
        { roomId: 2, roomName: "Twin", pricePerNight: 500_000 },
    ],
    guestFullName: "Trần Minh Khoa",
    guestEmail: "khoa@example.com",
    guestPhone: "0905123321",
};

describe("bookingTotal", () => {
    it("dùng thẳng totalAmount backend trả, không nhân số đêm lần nữa", () =>
        expect(bookingTotal(base)).toBe(4_500_000));
    it("không tự cộng lại giá/đêm các phòng (backend có thể đã trừ khuyến mãi)", () => {
        const discounted: PartnerBooking = { ...base, totalAmount: 4_000_000 };
        expect(bookingTotal(discounted)).toBe(4_000_000);
    });
});

describe("stageOf", () => {
    it("nhận phòng sau hôm nay -> sắp đến", () => expect(stageOf(base, "2026-10-23")).toBe("upcoming"));
    it("nhận phòng hôm nay -> đang lưu trú", () => expect(stageOf(base, "2026-10-24")).toBe("staying"));
    it("ngày trả phòng -> đã trả", () => expect(stageOf(base, "2026-10-27")).toBe("departed"));
    it("đơn huỷ hoặc hoàn tiền -> đã huỷ, bất kể ngày", () => {
        expect(stageOf({ ...base, paymentStatus: "Cancelled" }, "2026-10-23")).toBe("cancelled");
        expect(stageOf({ ...base, paymentStatus: "REFUNDED" }, "2026-10-25")).toBe("cancelled");
    });
});

describe("matchesQuery", () => {
    it("khớp mã đơn có hoặc không có tiền tố", () => {
        expect(matchesQuery(base, "MO-42")).toBe(true);
        expect(matchesQuery(base, "42")).toBe(true);
    });
    it("khớp tên (không phân biệt hoa thường) và SĐT", () => {
        expect(matchesQuery(base, "minh khoa")).toBe(true);
        expect(matchesQuery(base, "0905")).toBe(true);
    });
    it("không khớp -> false; chuỗi rỗng -> true", () => {
        expect(matchesQuery(base, "xyz")).toBe(false);
        expect(matchesQuery(base, "  ")).toBe(true);
    });
});
