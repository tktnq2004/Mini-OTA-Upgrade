import type { BookingPaymentStatus } from "@/lib/booking/resources";

export type ViewState = "loading" | "error" | "cancelled" | "refund" | "selecting" | "processing" | "slow" | "success";

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
