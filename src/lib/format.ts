
export function formatVnd(amount: number): string {
    return `${amount.toLocaleString("vi-VN")} ₫`;
}

// Rút gọn giá cho marker bản đồ — 30.000 -> "30k vnđ", 1.500.000 -> "1,5Tr vnđ"
// (từ 1 triệu trở lên đổi sang đơn vị Tr, làm tròn 1 chữ số thập phân, để
// không hiện số quá dài trong marker chật chỗ). Chỉ dùng ở chỗ cần cực ngắn
// gọn; formatVnd() vẫn dùng đầy đủ ở mọi nơi khác (card phòng, trang chi
// tiết...).
export function formatCompactVnd(amount: number): string {
    if (amount >= 1_000_000) {
        const millions = Math.round(amount / 100_000) / 10;
        return `${millions.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}Tr vnđ`;
    }
    const thousands = Math.round(amount / 1000);
    return `${thousands.toLocaleString("vi-VN")}k vnđ`;
}

// yyyy-mm-dd (hoặc nguyên 1 chuỗi ISO datetime có giờ, kiểu bookingDate trả về
// từ backend) -> ngày hiển thị theo ngôn ngữ đang dùng: "07/10/2026" (vi) hay
// "10/07/2026" (en). Luôn lấy đúng 10 ký tự đầu (phần ngày) trước khi parse,
// để nhận được cả 2 dạng chuỗi mà không lệch múi giờ.
export function formatDateVn(iso: string, locale: "vi" | "en" = "vi"): string {
    if (!iso) return "";
    const datePart = iso.slice(0, 10);
    const d = new Date(`${datePart}T00:00:00`);
    const intlLocale = locale === "en" ? "en-US" : "vi-VN";
    return d.toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Tiêu đề lịch chọn ngày: "Tháng 9 Năm 2026" (vi) / "September 2026" (en).
// month tính từ 1 (khớp định dạng yyyy-mm-dd dùng khắp dự án), không phải 0
// như Date.prototype gốc.
export function formatMonthYear(year: number, month: number, locale: "vi" | "en" = "vi"): string {
    const intlLocale = locale === "en" ? "en-US" : "vi-VN";
    return new Date(year, month - 1, 1).toLocaleDateString(intlLocale, { month: "long", year: "numeric" });
}

// Khoảng cách cho badge "Cách X km" ở danh sách khách sạn — 1 chữ số thập
// phân, đúng dấu phân cách thập phân theo ngôn ngữ (vi: dấu phẩy, en: dấu
// chấm) thay vì toFixed() luôn trả dấu chấm bất kể ngôn ngữ.
export function formatDistanceKm(km: number, locale: "vi" | "en" = "vi"): string {
    const intlLocale = locale === "en" ? "en-US" : "vi-VN";
    return km.toLocaleString(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Mốc thời gian backend trả dạng LocalDateTime của Java: "2026-11-15T15:53:11.169122"
// — KHÔNG kèm múi giờ, là giờ địa phương của server (Việt Nam, UTC+7), phần lẻ
// giây tới 6 chữ số. Date.parse thẳng sẽ hiểu theo múi giờ của TRÌNH DUYỆT
// (lệch giờ nếu khách ở nước khác) và không đảm bảo nhận >3 chữ số lẻ, nên
// cắt phần lẻ về mili giây rồi gắn +07:00. Chuỗi đã có múi giờ (Z / ±hh:mm)
// thì giữ nguyên. Trả NaN nếu rỗng hoặc không parse được.
const SERVER_UTC_OFFSET = "+07:00";
export function parseServerDateTime(value: string | null | undefined): number {
    if (!value) return NaN;
    const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
    const trimmed = value.replace(/(\.\d{3})\d+/, "$1");
    return Date.parse(hasZone ? trimmed : trimmed + SERVER_UTC_OFFSET);
}
