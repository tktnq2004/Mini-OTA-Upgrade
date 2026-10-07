import { NextRequest, NextResponse } from "next/server";
import { findHotelIdOfRoom } from "@/lib/hotels/server";

// /room/{roomId} -> /hotel/{hotelId}/room/{roomId}. Dùng ở nơi chỉ có roomId
// (lịch sử đặt phòng: booking không trả hotelId). Không tìm thấy -> /hotels.
export async function GET(req: NextRequest, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  const origin = req.nextUrl.origin;
  const id = Number(roomId);

  const hotelId = Number.isInteger(id) && id > 0 ? await findHotelIdOfRoom(id).catch(() => null) : null;
  if (!hotelId) return NextResponse.redirect(`${origin}/hotels`);
  return NextResponse.redirect(`${origin}/hotel/${hotelId}/room/${id}`);
}
