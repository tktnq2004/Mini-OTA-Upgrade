import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  decodeAccountJwt,
  extractBackendRefreshCookie,
  getApiBaseUrl,
} from "@/lib/auth/session";
import { BACKEND_TIMEOUT_MS, backendUnavailable } from "@/lib/api/backendProxy";

// Xác minh OTP khách vãng lai. Backend (docs/GUEST_BOOKING_API.md) tìm user
// theo email — chưa có thì tạo user GUEST từ fullName/phone — rồi trả
// access_token + set cookie refresh y hệt /auth/login-mail, nên route này gần
// như bản sao của .../auth/login-mail/route.ts. Từ đây khách có phiên thật,
// mọi API booking đi qua proxy /api/account như user đã đăng nhập.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.otp) {
    return NextResponse.json({ message: "Thiếu email hoặc mã OTP" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${getApiBaseUrl()}/auth/guest/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, otp: body.otp, fullName: body.fullName, phone: body.phone }),
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (err) {
    return backendUnavailable(err, "POST auth/guest/verify");
  }

  const envelope = await backendRes.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!backendRes.ok || !accessToken) {
    const raw = envelope?.error ?? envelope?.message ?? "Xác minh thất bại";
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
