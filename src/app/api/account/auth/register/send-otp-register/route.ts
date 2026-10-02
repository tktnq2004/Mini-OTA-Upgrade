import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/session";

// Public — không cần đăng nhập (route riêng, KHÔNG đi qua catch-all
// [...path] vốn bắt buộc có cookie truy cập — xem account/[...path]/route.ts).
// Chuyển thẳng response của backend (kể cả 429 kèm data.retryAfter) để FE đọc
// được qua AccountApiError.retryAfter, không bọc lại thành {message} như các
// route login/register cũ.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const backendRes = await fetch(`${getApiBaseUrl()}/auth/register/send-otp-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { "content-type": backendRes.headers.get("content-type") ?? "application/json" },
  });
}
