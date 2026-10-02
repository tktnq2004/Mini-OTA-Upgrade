import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  decodeAccountJwt,
  extractBackendRefreshCookie,
  getApiBaseUrl,
} from "@/lib/auth/session";

// Bước cuối đăng ký — cần đã gọi .../auth/register/send-otp-register trước
// đó để có mã OTP. Khác bản cũ (gọi POST /users rồi login riêng): backend
// /auth/register giờ tự kiểm tra OTP, tạo tài khoản VÀ trả luôn
// access_token + cookie refresh trong 1 lần gọi (y hệt /auth/login), nên
// không cần gọi login lần 2 nữa.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.fullName || !body?.username || !body?.email || !body?.password || !body?.phone || !body?.otp) {
    return NextResponse.json({ message: "Vui lòng nhập đủ thông tin bắt buộc" }, { status: 400 });
  }

  const backendRes = await fetch(`${getApiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: body.fullName,
      username: body.username,
      email: body.email,
      password: body.password,
      phone: body.phone,
      otp: body.otp,
    }),
    cache: "no-store",
  });
  const envelope = await backendRes.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!backendRes.ok || !accessToken) {
    const raw = envelope?.error ?? envelope?.message ?? "Đăng ký thất bại";
    const msg = Array.isArray(raw) ? raw.join(", ") : raw;
    return NextResponse.json({ message: msg }, { status: backendRes.status || 400 });
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
