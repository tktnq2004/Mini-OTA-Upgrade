import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, exchangeOAuth2Code } from "@/lib/auth/session";

// Backend (Spring Security oauth2Login) redirect trình duyệt về đây sau khi
// Google/Facebook login thành công, kèm 1 code dùng 1 lần (không phải access
// token thật — xem OAuth2SuccessHandler bên backend). Route này chạy
// server-side, đổi code lấy token thật rồi tự set cookie httpOnly
// mota_acc_at/mota_acc_rt — giống hệt /api/account/auth/login — access token
// không bao giờ chạm tới JS phía trình duyệt.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?social_error=missing_code`);
  }

  const result = await exchangeOAuth2Code(code);
  if (!result) {
    return NextResponse.redirect(`${origin}/login?social_error=1`);
  }

  if (result.status === "REGISTER_REQUIRED") {
    const params = new URLSearchParams({
      sessionId: result.sessionId ?? "",
      email: result.email ?? "",
      name: result.name ?? "",
    });
    return NextResponse.redirect(`${origin}/complete-profile?${params.toString()}`);
  }

  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set(ACCESS_COOKIE, result.accessToken!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: result.accessMaxAge,
  });
  if (result.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: result.refreshMaxAge ?? result.accessMaxAge,
    });
  }
  return res;
}
