import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  BACKEND_REFRESH_COOKIE_NAME,
  REFRESH_COOKIE,
  exchangeOAuth2Code,
  refreshBackendSession,
  type RefreshResult,
} from "@/lib/auth/session";

// Backend (Spring Security oauth2Login) redirect trình duyệt về đây sau khi
// Google/Facebook login thành công. Backend chỉ set cookie refresh token
// (refresh-token-Mini) chứ không trả access token. Cookie không phân biệt cổng
// nên trình duyệt gửi kèm nó tới đây (localhost:3000) -> route này gọi
// GET /auth/refresh server-to-server (backend chặn CORS từ trình duyệt) để lấy
// access token, rồi set cookie httpOnly mota_acc_at/mota_acc_rt giống
// /api/account/auth/login — access token không bao giờ chạm tới JS.
// Vẫn nhận ?code= của luồng handoff cũ để không gãy nếu backend còn dùng.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");

  let session: RefreshResult | null = null;

  if (code) {
    const result = await exchangeOAuth2Code(code);
    if (result?.status === "REGISTER_REQUIRED") {
      const params = new URLSearchParams({
        sessionId: result.sessionId ?? "",
        email: result.email ?? "",
        name: result.name ?? "",
      });
      return NextResponse.redirect(`${origin}/complete-profile?${params.toString()}`);
    }
    if (result?.accessToken) {
      session = {
        accessToken: result.accessToken,
        accessMaxAge: result.accessMaxAge ?? 60,
        refreshToken: result.refreshToken,
        refreshMaxAge: result.refreshMaxAge,
      };
    }
  } else {
    const backendRefreshToken = req.cookies.get(BACKEND_REFRESH_COOKIE_NAME)?.value;
    if (backendRefreshToken) {
      session = await refreshBackendSession(backendRefreshToken);
      // Backend không xoay refresh token -> giữ token cũ làm mota_acc_rt.
      if (session && !session.refreshToken) session.refreshToken = backendRefreshToken;
    }
  }

  if (!session) {
    return NextResponse.redirect(`${origin}/login?social_error=1`);
  }

  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set(ACCESS_COOKIE, session.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: session.accessMaxAge,
  });
  if (session.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: session.refreshMaxAge ?? session.accessMaxAge,
    });
  }
  // Refresh token đã chuyển sang mota_acc_rt -> bỏ bản backend để lại.
  res.cookies.delete(BACKEND_REFRESH_COOKIE_NAME);
  return res;
}
