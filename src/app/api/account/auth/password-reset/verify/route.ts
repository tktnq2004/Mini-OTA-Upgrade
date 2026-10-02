import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/session";

// Public — xác thực bằng chính token trong query, không cần cookie đăng nhập.
// Trang /reset-password gọi route này ngay khi mount để biết link còn dùng
// được không và có cần hỏi mật khẩu hiện tại không (requireOldPassword).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const backendRes = await fetch(
    `${getApiBaseUrl()}/auth/password-reset/verify?token=${encodeURIComponent(token)}`,
    { method: "GET", cache: "no-store" }
  );
  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { "content-type": backendRes.headers.get("content-type") ?? "application/json" },
  });
}
