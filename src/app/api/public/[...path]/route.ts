import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/hotels/config";
import { ACCESS_COOKIE, REFRESH_COOKIE, refreshBackendSession } from "@/lib/auth/session";
import { BACKEND_TIMEOUT_MS, backendUnavailable } from "@/lib/api/backendProxy";

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

  try {
    const backendRes = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    const text = await backendRes.text();
    const contentType = backendRes.headers.get("content-type") ?? "application/json";
    return new NextResponse(text, { status: backendRes.status, headers: { "content-type": contentType } });
  } catch (err) {
    return backendUnavailable(err, `GET ${path.join("/")}`);
  }
}

// POST công khai — chỉ các path backend đã permitAll (SecurityConfig.PUBLIC_POST_ENDPOINTS).
// Không mở POST tuỳ ý để proxy này không thành đường vòng vào API cần quyền.
//  - (ngày kín lấy qua GET rooms/{id} nên không cần POST riêng nữa)
//  - bookings: gắn Bearer nếu khách đang đăng nhập (booking gắn vào tài khoản),
//    không có/hỏng token thì đặt như khách vãng lai.
//  - payment/create-payment-intent: body { bookingId, paymentMethodId }, backend
//    tự tính tiền theo booking và trả clientSecret để xác nhận thẻ. Booking gắn
//    tài khoản thì backend đòi token của chủ booking -> cũng gắn Bearer.
//  - payments/{bookingId}/sync: sau khi confirm thẻ ở trình duyệt, nhờ backend
//    tự đối soát PaymentIntent với Stripe ngay (không đợi webhook). Gắn Bearer
//    giống create-payment-intent; khách vãng lai thì chuyển tiếp header
//    X-Booking-Token (token backend cấp lúc tạo booking).
const PUBLIC_POST_PATHS = new Set(["bookings", "payment/create-payment-intent"]);
const AUTH_OPTIONAL_PATHS = new Set(["bookings", "payment/create-payment-intent"]);
const PAYMENT_SYNC_PATH = /^payments\/\d+\/sync$/;

// Header client gửi lên được chuyển tiếp nguyên văn tới backend (theo path):
//  - X-Booking-Token: token khách vãng lai, chỉ cho payments/{id}/sync.
//  - Idempotency-Key: chống tạo trùng booking khi bấm lại/gửi lại, chỉ cho bookings.
function forwardedHeaders(req: NextRequest, joined: string, isSync: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  const bookingToken = isSync ? req.headers.get("x-booking-token") : null;
  if (bookingToken) out["X-Booking-Token"] = bookingToken;
  const idempotencyKey = joined === "bookings" ? req.headers.get("idempotency-key") : null;
  if (idempotencyKey) out["Idempotency-Key"] = idempotencyKey;
  return out;
}

async function postBackend(url: string, body: string, token: string | undefined, extra: Record<string, string>) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  const isSync = PAYMENT_SYNC_PATH.test(joined);
  if (!PUBLIC_POST_PATHS.has(joined) && !isSync) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const url = `${getApiBaseUrl()}/${joined}`;
  const body = await req.text();
  let accessToken = AUTH_OPTIONAL_PATHS.has(joined) || isSync ? req.cookies.get(ACCESS_COOKIE)?.value : undefined;

  const extra = forwardedHeaders(req, joined, isSync);

  try {
    let backendRes = await postBackend(url, body, accessToken, extra);
    if (accessToken && backendRes.status === 401) {
      const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
      const refreshed = refreshToken ? await refreshBackendSession(refreshToken) : null;
      accessToken = refreshed?.accessToken;
      backendRes = await postBackend(url, body, accessToken, extra);
    }

    const text = await backendRes.text();
    const contentType = backendRes.headers.get("content-type") ?? "application/json";
    return new NextResponse(text, { status: backendRes.status, headers: { "content-type": contentType } });
  } catch (err) {
    return backendUnavailable(err, `POST ${joined}`);
  }
}
