import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, completeProviderProfile } from "@/lib/auth/session";

// Gọi từ trang /complete-profile sau khi user social login lần đầu (chưa có
// tài khoản) nhập xong username/phone. Cùng kiểu proxy server-side như
// /api/account/auth/login — access token không lộ ra JS phía client.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: string | undefined = body?.sessionId;
  const username: string | undefined = body?.username;
  const phone: string | undefined = body?.phone;

  if (!sessionId || !username || !phone) {
    return NextResponse.json({ message: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const result = await completeProviderProfile({ sessionId, username, phone });
  if (!result) {
    return NextResponse.json({ message: "Không tạo được tài khoản, phiên có thể đã hết hạn" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, result.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: result.accessMaxAge,
  });
  if (result.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: result.refreshMaxAge ?? result.accessMaxAge,
    });
  }
  return res;
}
