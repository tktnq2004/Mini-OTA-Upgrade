import { addDaysIso } from "@/lib/searchFilters";
import { formatVnd } from "@/lib/format";

// Tính giá XEM TRƯỚC sau khuyến mãi — chạy y hệt quy tắc backend (docs/
// DISCOUNT_API.md mục 1) để tag/giá gạch ngang/tổng ở checkout khớp với số
// backend chốt lúc tạo booking. Số tiền THẬT phải trả vẫn luôn là số backend
// trả về (payableAmount), không phải số tính ở đây.
//
// Quy tắc:
// - Tính theo TỪNG ĐÊM ở: đêm D được giảm nếu startDate <= D <= endDate.
// - Mỗi đêm chỉ áp 1 discount: cái giảm nhiều tiền nhất (hoà -> startDate
//   sớm hơn, rồi id nhỏ hơn). Không cộng dồn.
// - PERCENT: round(price × value / 100). FIXED_AMOUNT: min(value, price).

export type DiscountUnit = "PERCENT" | "FIXED_AMOUNT";

// Discount đính kèm trong Room public (GET /hotels/{id}, /rooms/{id}) — backend
// chỉ trả discount đang bật và chưa hết hạn.
export interface RoomDiscount {
  id: number;
  name: string;
  discountValue: number;
  discountUnit: DiscountUnit;
  startDate: string; // yyyy-mm-dd, đêm đầu được giảm
  endDate: string; // yyyy-mm-dd, đêm CUỐI được giảm (bao gồm)
}

export interface AppliedDiscount {
  discount: RoomDiscount;
  nights: number;
  amount: number;
}

export interface RoomQuote {
  nights: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  // Sắp theo số tiền giảm giảm dần — phần tử đầu là discount "chính" để gắn tag.
  applied: AppliedDiscount[];
}

// Các đêm của kỳ ở [checkIn, checkOut) — checkOut là ngày trả phòng, không tính.
export function stayNights(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  if (!checkIn || !checkOut) return nights;
  for (let d = checkIn; d < checkOut; d = addDaysIso(d, 1)) {
    nights.push(d);
    if (nights.length > 366) break; // chặn vòng lặp vô hạn nếu dữ liệu lỗi
  }
  return nights;
}

export function nightReduction(price: number, discount: RoomDiscount): number {
  if (discount.discountUnit === "PERCENT") {
    return Math.round((price * discount.discountValue) / 100);
  }
  return Math.min(discount.discountValue, price);
}

function isBetter(price: number, a: RoomDiscount, b: RoomDiscount): boolean {
  const diff = nightReduction(price, a) - nightReduction(price, b);
  if (diff !== 0) return diff > 0;
  if (a.startDate !== b.startDate) return a.startDate < b.startDate;
  return a.id < b.id;
}

export function bestDiscountForNight(price: number, discounts: RoomDiscount[], night: string): RoomDiscount | null {
  let best: RoomDiscount | null = null;
  for (const d of discounts) {
    if (night < d.startDate || night > d.endDate) continue;
    if (!best || isBetter(price, d, best)) best = d;
  }
  return best;
}

export function quoteRoom(
  room: { price: number; discounts?: RoomDiscount[] | null },
  checkIn: string,
  checkOut: string,
): RoomQuote {
  const nights = stayNights(checkIn, checkOut);
  const discounts = room.discounts ?? [];
  const byId = new Map<number, AppliedDiscount>();
  let discountAmount = 0;
  for (const night of nights) {
    const best = bestDiscountForNight(room.price, discounts, night);
    if (!best) continue;
    const amount = nightReduction(room.price, best);
    discountAmount += amount;
    const entry = byId.get(best.id) ?? { discount: best, nights: 0, amount: 0 };
    entry.nights += 1;
    entry.amount += amount;
    byId.set(best.id, entry);
  }
  const subtotal = room.price * nights.length;
  return {
    nights: nights.length,
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    applied: Array.from(byId.values()).sort((a, b) => b.amount - a.amount),
  };
}

// Discount để gắn tag cho 1 phòng trong kỳ ở đang chọn: cái giảm được nhiều
// tiền nhất trong kỳ. Chưa chọn ngày thì nơi gọi tự truyền đêm hôm nay
// (today → today+1) để tag phản ánh khuyến mãi đang chạy.
export function headlineDiscount(
  room: { price: number; discounts?: RoomDiscount[] | null },
  checkIn: string,
  checkOut: string,
): AppliedDiscount | null {
  return quoteRoom(room, checkIn, checkOut).applied[0] ?? null;
}

// "-20%" / "-50.000 ₫"
export function formatDiscountBadge(discount: Pick<RoomDiscount, "discountValue" | "discountUnit">): string {
  return discount.discountUnit === "PERCENT"
    ? `-${discount.discountValue}%`
    : `-${formatVnd(discount.discountValue)}`;
}
