"use client";

import { getRoom } from "@/lib/hotels/client";
import type { Room } from "@/lib/hotels/types";

// Ngày không đặt được ("bôi xám" trong DateRangePicker) lấy từ GET /rooms/{id}:
//   minDate / maxDate      cửa sổ đặt phòng (backend: +36 giờ … +2 tháng)
//   unavailableRanges[]    { startDate, endDate } các booking chưa huỷ, đã cắt
//                          vào cửa sổ. endDate = NGÀY TRẢ phòng của booking đó,
//                          ngày này vẫn nhận khách mới nên KHÔNG bị khoá — chỉ
//                          khoá các đêm bị chiếm: [startDate, endDate).
export interface UnavailableRange {
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd (ngày trả phòng, không tính là đêm bị chiếm)
}

export interface RoomsAvailability {
  disabledDates: string[]; // các đêm đã kín (hợp của mọi phòng)
  minDate?: string;
  maxDate?: string;
}

// Gộp availability của 1 hay nhiều phòng. Đặt nhiều phòng 1 lúc: 1 phòng kín
// đêm nào là cả cụm không đặt được đêm đó -> lấy HỢP các đêm kín, và cửa sổ
// đặt là GIAO các cửa sổ (min lớn nhất, max nhỏ nhất).
export function mergeAvailability(rooms: Pick<Room, "minDate" | "maxDate" | "unavailableRanges">[]): RoomsAvailability {
  const disabled = new Set<string>();
  let minDate: string | undefined;
  let maxDate: string | undefined;
  for (const r of rooms) {
    expandRanges(r.unavailableRanges ?? []).forEach((d) => disabled.add(d));
    if (r.minDate && (!minDate || r.minDate > minDate)) minDate = r.minDate;
    if (r.maxDate && (!maxDate || r.maxDate < maxDate)) maxDate = r.maxDate;
  }
  return { disabledDates: Array.from(disabled), minDate, maxDate };
}

// Dùng ở checkout (chỉ có roomId trên URL): gọi GET /rooms/{id} cho từng phòng.
export async function getRoomsAvailability(roomIds: number[]): Promise<RoomsAvailability> {
  const rooms = await Promise.all(roomIds.map((id) => getRoom(id)));
  return mergeAvailability(rooms);
}

// Khoảng [checkIn, checkOut) có hợp lệ với availability không — dùng để bỏ
// ngày điền sẵn từ URL/tìm kiếm nếu đã kín hoặc ngoài cửa sổ đặt phòng.
export function isRangeBookable(checkIn: string | null, checkOut: string | null, a: RoomsAvailability): boolean {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;
  if (a.minDate && checkIn < a.minDate) return false;
  if (a.maxDate && checkOut > a.maxDate) return false;
  const blocked = new Set(a.disabledDates);
  return !expandRanges([{ startDate: checkIn, endDate: checkOut }]).some((d) => blocked.has(d));
}

// Bung [{startDate,endDate}] -> từng đêm bị chiếm yyyy-mm-dd (loại endDate).
export function expandRanges(ranges: UnavailableRange[]): string[] {
  const out: string[] = [];
  for (const { startDate, endDate } of ranges) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const cur = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    while (cur < end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      out.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}
