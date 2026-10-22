import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/hotels/config";
import { BACKEND_TIMEOUT_MS, backendUnavailable } from "@/lib/api/backendProxy";

// Proxy GET (mọi path), không cần cookie/token — cho các trang công khai (client
// component: Map, danh sách khách sạn, giỏ hàng...) gọi qua same-origin
// thay vì thẳng tới backend (backend chưa cấu hình CORS cho gọi trực tiếp
// từ trình duyệt, giống lý do đã có 2 proxy /api/admin, /api/account).
// Server Component (trang chi tiết khách sạn/phòng) không cần proxy này —
// gọi thẳng backend qua src/lib/hotels/server.ts (server-to-server, không
// có CORS).
// Không có POST: booking/thanh toán luôn cần phiên (khách vãng lai cũng có
// token GUEST sau khi xác minh OTP — docs/GUEST_BOOKING_API.md) nên đi qua
// proxy /api/account; mở POST ở đây là chừa đường vòng không cần token.
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
