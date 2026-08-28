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
  if (!body?.fullName || !body?.username || !body?.email || !body?.password || !body?.phone) {
    return NextResponse.json({ message: "Vui lòng nhập đủ thông tin bắt buộc" }, { status: 400 });
  }

  // POST /users là endpoint public thật (permitAll ở backend) — không cần
  // role trong payload, backend tự mặc định CUSTOMER (đã sửa bug null role
  // làm crash lúc đăng nhập lần đầu — xem UserService.create_user).
  const createRes = await fetch(`${getApiBaseUrl()}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: body.fullName,
      username: body.username,
      email: body.email,
      password: body.password,
      phone: body.phone,
    }),
    cache: "no-store",
  });
  const createEnvelope = await createRes.json().catch(() => null);
  if (!createRes.ok) {
    const raw = createEnvelope?.error ?? createEnvelope?.message ?? "Đăng ký thất bại";
    const msg = Array.isArray(raw) ? raw.join(", ") : raw;
    return NextResponse.json({ message: msg }, { status: createRes.status || 400 });
  }

  // Đăng ký xong đăng nhập luôn cho khách (UX mượt hơn bắt gõ lại form login) —
  // gọi thẳng /auth/login với đúng email/password vừa tạo, y hệt route login.
  const loginRes = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });
  const loginEnvelope = await loginRes.json().catch(() => null);
  const accessToken: string | undefined = loginEnvelope?.data?.access_token;
  if (!loginRes.ok || !accessToken) {
    // Tài khoản đã tạo thành công nhưng auto-login lỗi (hiếm) — vẫn báo
    // thành công để FE điều hướng qua trang login thủ công thay vì báo lỗi
    // gây hiểu lầm "đăng ký thất bại".
    return NextResponse.json({ user: null, autoLoginFailed: true });
  }

  const claims = decodeAccountJwt(accessToken);
  if (!claims) {
    return NextResponse.json({ user: null, autoLoginFailed: true });
  }

  const refreshCookie = extractBackendRefreshCookie(loginRes.headers);
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
