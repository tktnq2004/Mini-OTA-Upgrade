import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  decodeAdminJwt,
  extractBackendRefreshCookie,
  getAdminApiBaseUrl,
} from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: "Thiếu email hoặc mật khẩu" }, { status: 400 });
  }

  const backendRes = await fetch(`${getAdminApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });

  const data = await backendRes.json().catch(() => null);
  if (!backendRes.ok || !data?.access_token) {
    return NextResponse.json(data ?? { message: "Đăng nhập thất bại" }, { status: backendRes.status || 401 });
  }

  const claims = decodeAdminJwt(data.access_token);
  if (!claims || claims.role !== "ADMIN") {
    return NextResponse.json({ message: "Tài khoản này không có quyền admin" }, { status: 403 });
  }

  const refreshCookie = extractBackendRefreshCookie(backendRes.headers);
  const accessMaxAge = Math.max(60, claims.exp - Math.floor(Date.now() / 1000));

  const res = NextResponse.json({
    user: { id: claims.user.id, email: claims.user.email, name: claims.user.name, role: claims.role },
  });
  res.cookies.set(ACCESS_COOKIE, data.access_token, {
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
