import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/session";

// Public — không cần đăng nhập. Backend luôn trả 200 dù email có tồn tại hay
// không (không lộ danh sách email đã đăng ký), nên route này chỉ việc chuyển
// tiếp nguyên trạng.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const backendRes = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { "content-type": backendRes.headers.get("content-type") ?? "application/json" },
  });
}
