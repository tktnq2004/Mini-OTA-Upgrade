// Cờ bật/tắt các phần giao diện mà backend CHƯA hỗ trợ. Tắt mặc định để người dùng thật không
// gặp nội dung "giả" (mã giảm giá không áp dụng được, form nhận tin không lưu email, nút tải app
// chưa có app). Bật lên khi phần backend tương ứng sẵn sàng.
export const FEATURES = {
    /** Băng chuyền mã ưu đãi ở trang chủ — cần API khuyến mãi + áp mã ở bước thanh toán. */
    promoCodes: false,
    /** Khung "Nhận ưu đãi sớm nhất" + "Ứng dụng Trạm OTA" — cần API nhận email và app trên store. */
    newsletterAndApp: false,
    /** Lựa chọn "Ví MoMo" ở trang thanh toán — backend chưa có cổng MoMo (MomoPayment chưa làm gì). */
    momoPayment: false,
    /**
     * CHỈ ĐỂ TEST idempotency backend: không khoá nút "Tiếp tục thanh toán" (tạo booking) và
     * "Thanh toán" (thẻ) lúc đang gửi -> bấm liên tiếp được nhiều lần. Bật bằng
     * NEXT_PUBLIC_ALLOW_DOUBLE_SUBMIT=true trong .env.local (không commit), restart dev server.
     */
    allowDoubleSubmit: process.env.NEXT_PUBLIC_ALLOW_DOUBLE_SUBMIT === "true",
} as const;
