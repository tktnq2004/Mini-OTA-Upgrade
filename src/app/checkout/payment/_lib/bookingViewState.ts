import type { BookingPaymentStatus } from "@/lib/booking/resources";

// "verify": chưa có phiên (khách vãng lai mở lại link sau khi phiên hết hạn /
// trên thiết bị khác) -> xác minh email bằng OTP rồi tải lại booking.
export type ViewState =
    | "loading"
    | "verify"
    | "error"
    | "cancelled"
    | "refund"
    | "selecting"
    | "processing"
    | "slow"
    | "success";

// Trạng thái booking -> màn hình. undefined = còn Pending, để nơi gọi tự quyết.
// PROCESSING: thẻ đã giữ tiền (requires_capture), backend sắp capture -> chờ,
// tuyệt đối không cho chọn phương thức trả lần nữa.
export function viewStateOf(status: BookingPaymentStatus): ViewState | undefined {
    switch (status) {
        case "Completed":
            return "success";
        case "Cancelled":
            return "cancelled";
        case "REFUND_PENDING":
        case "REFUNDED":
            return "refund";
        case "PROCESSING":
            return "processing";
        default:
            return undefined;
    }
}
