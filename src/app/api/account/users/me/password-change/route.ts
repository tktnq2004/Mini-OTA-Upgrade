import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/session";

// Public theo đúng backend (/api/v1/users/** permitAll) — xác thực bằng
// token trong body (lấy từ link email), KHÔNG phải Bearer JWT, nên route này
// không đòi cookie đăng nhập (khác hẳn catch-all [...path]). Dùng chung cho
// cả "quên mật khẩu" (chưa đăng nhập) lẫn "đổi mật khẩu" (đã đăng nhập,
// req.oldPassword bắt buộc) — PasswordResetService tự phân biệt qua token.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const backendRes = await fetch(`${getApiBaseUrl()}/users/me/password-change`, {
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
