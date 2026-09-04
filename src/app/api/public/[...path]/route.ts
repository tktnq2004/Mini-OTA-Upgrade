import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/hotels/config";

// Proxy CHỈ GET, không cần cookie/token — cho các trang công khai (client
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
