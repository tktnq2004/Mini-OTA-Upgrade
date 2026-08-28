import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  decodeAccountJwt,
  extractBackendRefreshCookie,
  getApiBaseUrl,
} from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: "Thiếu email hoặc mật khẩu" }, { status: 400 });
  }

  const backendRes = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });

  const envelope = await backendRes.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!backendRes.ok || !accessToken) {
    // Backend luôn nhét message thật vào "error" (kể cả khi message chung
    // chung là "Token incorrect" — xem CustomAuthenticationEntryPoint.java,
    // 1 quirk đã biết của backend này), nên ưu tiên đọc "error" trước.
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
