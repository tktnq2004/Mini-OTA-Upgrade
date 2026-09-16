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
