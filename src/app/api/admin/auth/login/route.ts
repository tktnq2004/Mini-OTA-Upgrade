import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  decodeAdminJwt,
  extractBackendRefreshCookie,
  getAdminApiBaseUrl,
  probeAdminAccess,
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

  // Response thành công của backend bọc trong { data: { access_token, user }, ... }.
  const envelope = await backendRes.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!backendRes.ok || !accessToken) {
    return NextResponse.json(
      { message: envelope?.error ?? envelope?.message ?? "Đăng nhập thất bại" },
      { status: backendRes.status || 401 }
    );
  }

  const claims = decodeAdminJwt(accessToken);
  if (!claims) {
    return NextResponse.json({ message: "Token trả về không hợp lệ" }, { status: 500 });
  }

  // JWT không còn mang role/permission — phải thử gọi thật 1 endpoint chỉ
  // admin mới có quyền để biết tài khoản này có được vào /admin hay không.
  const isAdmin = await probeAdminAccess(accessToken);
  if (!isAdmin) {
    return NextResponse.json(
      { message: "Tài khoản này không có quyền quản trị (thiếu role/permission phù hợp)" },
      { status: 403 }
    );
  }

  const refreshCookie = extractBackendRefreshCookie(backendRes.headers);
  const accessMaxAge = Math.max(60, claims.exp - Math.floor(Date.now() / 1000));

  const res = NextResponse.json({
    user: { id: claims.user.id, email: claims.user.email, name: claims.user.name },
  });
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
