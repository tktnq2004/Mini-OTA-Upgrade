import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/session";

// Public — không cần đăng nhập. Chuyển thẳng response của backend (kể cả 429
// kèm data.retryAfter) để FE đọc được qua AccountApiError.retryAfter — xem
// cùng cách làm ở .../register/send-otp-register/route.ts.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const backendRes = await fetch(`${getApiBaseUrl()}/auth/login/send-otp-login`, {
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
