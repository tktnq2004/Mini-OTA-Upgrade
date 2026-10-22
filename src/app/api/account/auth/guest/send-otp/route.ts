import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/session";
import { BACKEND_TIMEOUT_MS, backendUnavailable } from "@/lib/api/backendProxy";

// Public — gửi OTP xác minh email cho khách vãng lai (trước khi đặt phòng, tra
// lịch sử, mở lại trang thanh toán). Khác send-otp-login ở chỗ email chưa có
// tài khoản vẫn nhận mã (bước verify sẽ tạo user GUEST). Chuyển thẳng response
// backend (kể cả 429 kèm data.retryAfter) — xem send-otp-login.
export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const backendRes = await fetch(`${getApiBaseUrl()}/auth/guest/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    const text = await backendRes.text();
    return new NextResponse(text, {
      status: backendRes.status,
      headers: { "content-type": backendRes.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return backendUnavailable(err, "POST auth/guest/send-otp");
  }
}
