import { NextResponse } from "next/server";

// Dùng chung cho 3 proxy /api/public, /api/admin, /api/account (route handler,
// chạy phía server Next.js).
//
// Thời gian chờ tối đa 1 request tới backend. Không đặt thì backend treo
// (vd. kẹt DB) sẽ giữ request của khách mãi không trả lời. 30s là đủ rộng cho
// các lời gọi chậm nhất hiện có (tạo PaymentIntent / đối soát gọi sang Stripe).
export const BACKEND_TIMEOUT_MS = 30_000;

// Backend tắt / mất mạng thì fetch ném lỗi (TypeError: fetch failed) chứ không
// có response — để lọt ra ngoài thì Next trả 500 thô không có envelope, client
// chỉ hiện câu dự phòng chung chung. Trả về đúng dạng envelope RestResponse
// của backend để errorMessageFrom (lib/api/envelope) đọc được câu báo lỗi:
//  - quá BACKEND_TIMEOUT_MS -> 504
//  - không kết nối được     -> 502
export function backendUnavailable(err: unknown, path: string): NextResponse {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const status = timedOut ? 504 : 502;
    console.error(`[proxy] ${status} ${path}:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
        {
            statuscode: status,
            error: timedOut
                ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút."
                : "Không kết nối được tới máy chủ. Vui lòng thử lại sau ít phút.",
            message: "Backend unavailable",
            data: null,
        },
        { status },
    );
}
