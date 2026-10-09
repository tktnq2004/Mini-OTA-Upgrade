// Cờ bật/tắt các phần giao diện mà backend CHƯA hỗ trợ. Tắt mặc định để người dùng thật không
// gặp nội dung "giả" (mã giảm giá không áp dụng được, form nhận tin không lưu email, nút tải app
// chưa có app). Bật lên khi phần backend tương ứng sẵn sàng.
export const FEATURES = {
    /** Băng chuyền mã ưu đãi ở trang chủ — cần API khuyến mãi + áp mã ở bước thanh toán. */
    promoCodes: false,
    /** Khung "Nhận ưu đãi sớm nhất" + "Ứng dụng WenGo" — cần API nhận email và app trên store. */
    newsletterAndApp: false,
} as const;
