import type { RoomType } from "@/lib/api/types";

// Sức chứa / chính sách / tiện nghi nằm ở loại phòng (docs/ROOM_TYPE_API.md). Phòng dữ liệu
// cũ chưa gán loại (roomType null) coi như 1 khách, không chính sách, không tiện nghi.
interface WithRoomType {
    roomType: RoomType | null;
}

export const roomCapacity = (room: WithRoomType) => room.roomType?.capacity ?? 1;

export const roomAmenities = (room: WithRoomType) => room.roomType?.amenities ?? [];

// Nhãn tiếng Việt cho 3 chính sách — dùng ở trang quản lý (partner/admin).
export const roomTypePolicyLabels = (t: Pick<RoomType, "cancellationPolicy" | "allowPets" | "allowSmoking">) => [
    t.cancellationPolicy ? "Huỷ miễn phí" : "Không hoàn huỷ",
    t.allowPets ? "Cho thú cưng" : "Không thú cưng",
    t.allowSmoking ? "Cho hút thuốc" : "Không hút thuốc",
];
