import { describe, expect, it } from "vitest";
import type { RoomType } from "@/lib/api/types";
import { roomAmenities, roomCapacity, roomTypePolicyLabels } from "./roomType";

const deluxe: RoomType = {
    id: 41,
    hotelId: 3,
    roomTypeName: "Deluxe",
    capacity: 3,
    allowSmoking: false,
    allowPets: true,
    cancellationPolicy: true,
    amenities: [{ id: 1, name: "Wi-Fi", icon: "wifi" }],
    views: [],
};

describe("roomCapacity / roomAmenities", () => {
    it("đọc từ loại phòng", () => {
        expect(roomCapacity({ roomType: deluxe })).toBe(3);
        expect(roomAmenities({ roomType: deluxe }).map((a) => a.name)).toEqual(["Wi-Fi"]);
    });

    it("phòng chưa gán loại: 1 khách, không tiện nghi", () => {
        expect(roomCapacity({ roomType: null })).toBe(1);
        expect(roomAmenities({ roomType: null })).toEqual([]);
    });
});

describe("roomTypePolicyLabels", () => {
    it("theo đúng thứ tự huỷ / thú cưng / hút thuốc", () => {
        expect(roomTypePolicyLabels(deluxe)).toEqual(["Huỷ miễn phí", "Cho thú cưng", "Không hút thuốc"]);
    });
});
