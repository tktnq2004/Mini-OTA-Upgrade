import type { Discount } from "@/lib/admin/types";

// Khuyến mãi còn hiệu lực với 1 phòng: đang bật, chưa kết thúc (endDate >= hôm nay) và
// áp cho phòng đó — roomIds rỗng nghĩa là áp cho mọi phòng của hotel.
export function discountsForRoom(discounts: Discount[], roomId: number, today: string): Discount[] {
  return discounts.filter(
    (d) => d.active && d.endDate >= today && (d.roomIds.length === 0 || d.roomIds.includes(roomId))
  );
}
