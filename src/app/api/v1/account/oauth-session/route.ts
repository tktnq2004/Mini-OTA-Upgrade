import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  BACKEND_REFRESH_COOKIE_NAME,
  REFRESH_COOKIE,
  decodeAccountJwt,
  refreshBackendSession,
} from "@/lib/auth/session";

// Google login (Spring oauth2Login): sau khi Google trả về
// /login/oauth2/code/google, backend set cookie refresh-token-Mini với
// Path=/api/v1 rồi redirect về trang chủ (app.frontend.url) — KHÔNG kèm token
// nào trên URL. Cookie không phân biệt cổng nhưng có phân biệt path, nên
// trình duyệt chỉ gửi nó tới các URL /api/v1/* của Next — vì vậy route này
// phải nằm dưới /api/v1 chứ không phải /api/account.
//
// AccountProvider gọi route này lúc mount khi chưa đăng nhập: có cookie thì
// gọi GET /auth/refresh server-to-server để lấy access token, set cookie
// httpOnly mota_acc_at/mota_acc_rt giống /api/account/auth/login, rồi xoá
// cookie của backend. Không có cookie -> { user: null }, không gọi backend.
export async function POST(req: NextRequest) {
  const backendRefreshToken = req.cookies.get(BACKEND_REFRESH_COOKIE_NAME)?.value;
  if (!backendRefreshToken) return NextResponse.json({ user: null });

  const session = await refreshBackendSession(backendRefreshToken).catch(() => null);
  const claims = session ? decodeAccountJwt(session.accessToken) : null;

  const res = NextResponse.json({ user: claims?.user ?? null });
  // Dùng 1 lần — xoá dù thành công hay không để lần tải trang sau không gọi
  // lại backend với token hỏng. Phải trùng path với lúc backend set.
  res.cookies.set(BACKEND_REFRESH_COOKIE_NAME, "", { path: "/api/v1", maxAge: 0 });
  if (!session || !claims) return res;

  res.cookies.set(ACCESS_COOKIE, session.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: session.accessMaxAge,
  });
  // /auth/refresh xoay refresh token (token cũ bị thay trong DB) -> phải lưu
  // bản mới; không có bản mới thì mới giữ bản cũ.
  res.cookies.set(REFRESH_COOKIE, session.refreshToken ?? backendRefreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: session.refreshMaxAge ?? session.accessMaxAge,
  });
  return res;
}
