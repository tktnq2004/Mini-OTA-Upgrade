import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/hotels/config";
import { ACCESS_COOKIE, REFRESH_COOKIE, refreshBackendSession } from "@/lib/auth/session";

// Proxy GET (mọi path) + POST (chỉ whitelist bên dưới), không cần cookie/token — cho các trang công khai (client
// component: Map, danh sách khách sạn, giỏ hàng...) gọi qua same-origin
// thay vì thẳng tới backend (backend chưa cấu hình CORS cho gọi trực tiếp
// từ trình duyệt, giống lý do đã có 2 proxy /api/admin, /api/account).
// Server Component (trang chi tiết khách sạn/phòng) không cần proxy này —
// gọi thẳng backend qua src/lib/hotels/server.ts (server-to-server, không
// có CORS).
export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = `${getApiBaseUrl()}/${path.join("/")}${req.nextUrl.search}`;

  const backendRes = await fetch(url, { method: "GET", cache: "no-store" });
  const text = await backendRes.text();
  const contentType = backendRes.headers.get("content-type") ?? "application/json";
  return new NextResponse(text, { status: backendRes.status, headers: { "content-type": contentType } });
}

// POST công khai — chỉ 2 path backend đã permitAll (SecurityConfig.PUBLIC_POST_ENDPOINTS).
// Không mở POST tuỳ ý để proxy này không thành đường vòng vào API cần quyền.
//  - (ngày kín lấy qua GET rooms/{id} nên không cần POST riêng nữa)
//  - bookings: gắn Bearer nếu khách đang đăng nhập (booking gắn vào tài khoản),
//    không có/hỏng token thì đặt như khách vãng lai.
const PUBLIC_POST_PATHS = new Set(["bookings"]);

async function postBackend(url: string, body: string, token?: string) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
    cache: "no-store",
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  if (!PUBLIC_POST_PATHS.has(joined)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const url = `${getApiBaseUrl()}/${joined}`;
  const body = await req.text();
  let accessToken = joined === "bookings" ? req.cookies.get(ACCESS_COOKIE)?.value : undefined;

  let backendRes = await postBackend(url, body, accessToken);
  if (accessToken && backendRes.status === 401) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    const refreshed = refreshToken ? await refreshBackendSession(refreshToken) : null;
    accessToken = refreshed?.accessToken;
    backendRes = await postBackend(url, body, accessToken);
  }

  const text = await backendRes.text();
  const contentType = backendRes.headers.get("content-type") ?? "application/json";
  return new NextResponse(text, { status: backendRes.status, headers: { "content-type": contentType } });
}
