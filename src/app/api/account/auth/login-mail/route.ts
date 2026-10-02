import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  decodeAccountJwt,
  extractBackendRefreshCookie,
  getApiBaseUrl,
} from "@/lib/auth/session";

// Đăng nhập không cần mật khẩu — xác thực bằng OTP vừa gửi qua
// send-otp-login. Backend (AuthService.loginByOtp) trả access_token + set
// cookie refresh y hệt /auth/login, nên route này gần như là bản sao của
// .../auth/login/route.ts, chỉ khác body gửi lên và message lỗi mặc định.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.otp) {
    return NextResponse.json({ message: "Thiếu email hoặc mã OTP" }, { status: 400 });
  }

  const backendRes = await fetch(`${getApiBaseUrl()}/auth/login-mail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, otp: body.otp }),
    cache: "no-store",
  });

  const envelope = await backendRes.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!backendRes.ok || !accessToken) {
    const raw = envelope?.error ?? envelope?.message ?? "Đăng nhập thất bại";
    const msg = Array.isArray(raw) ? raw.join(", ") : raw;
    return NextResponse.json({ message: msg }, { status: backendRes.status || 401 });
  }

  const claims = decodeAccountJwt(accessToken);
  if (!claims) {
    return NextResponse.json({ message: "Token trả về không hợp lệ" }, { status: 500 });
  }

  const refreshCookie = extractBackendRefreshCookie(backendRes.headers);
  const accessMaxAge = Math.max(60, claims.exp - Math.floor(Date.now() / 1000));

  const res = NextResponse.json({ user: claims.user });
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  if (refreshCookie) {
    res.cookies.set(REFRESH_COOKIE, refreshCookie.value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: refreshCookie.maxAgeSeconds ?? accessMaxAge,
    });
  }
  return res;
}
