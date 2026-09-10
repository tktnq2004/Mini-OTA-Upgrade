"use client";

// Ngày không đặt được ("bôi xám" trong DateRangePicker) — do backend tính từ
// các booking đã có của (các) phòng đang chọn.
//
// TODO(backend): thay thân hàm bằng 1 request thật, ví dụ:
//   GET /api/public/rooms/availability?roomIds=1,2,3&from=2026-09-10&to=2027-03-10
//   Response (bọc envelope { data }):
//     - Cách A: string[] danh sách ngày yyyy-mm-dd đã KÍN cho TẤT CẢ roomIds
//       (nếu book nhiều phòng 1 lúc thì 1 ngày chỉ cần 1 phòng kín là cả cụm
//       không đặt được ngày đó — trả về hợp của các ngày kín).
//     - Cách B: [{ from, to }] các khoảng đã đặt, rồi expandRanges() ở client.
//   Nhớ tính cả booking đang "giữ chỗ tạm" (chưa thanh toán, ExpirationTime
//   chưa hết hạn) là đã kín.
//
// Hiện chưa có API → trả rỗng: picker cho chọn mọi ngày từ hôm nay trở đi.
export interface UnavailableRange {
  from: string; // yyyy-mm-dd (đêm đầu tiên bị chiếm)
  to: string; // yyyy-mm-dd (đêm cuối bị chiếm, bao gồm)
}

export async function getUnavailableDates(
  hotelId: number,
  roomIds: number[],
): Promise<string[]> {
  // const params = new URLSearchParams({ roomIds: roomIds.join(",") });
  // const res = await fetch(`/api/public/rooms/availability?${params}`, { cache: "no-store" });
  // return unwrapResponse<string[]>(res);
  void hotelId;
  void roomIds;
  return [];
}

// Bung [{from,to}] -> danh sách từng ngày yyyy-mm-dd (dùng nếu backend chọn cách B).
export function expandRanges(ranges: UnavailableRange[]): string[] {
  const out: string[] = [];
  for (const { from, to } of ranges) {
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm, td] = to.split("-").map(Number);
    const cur = new Date(fy, fm - 1, fd);
    const end = new Date(ty, tm - 1, td);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      out.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}
