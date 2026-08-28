import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, decodeAccountJwt } from "@/lib/auth/session";

// Cookie access token là httpOnly (JS phía client không đọc được) — route
// này cho AccountProvider hỏi "đang đăng nhập chưa, là ai" lúc mount mà
// không cần lộ token ra client. Chỉ giải mã payload để đọc user{id,email,
// name}, không gọi backend (rẻ, dùng cho mọi trang).
export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ user: null });

  const claims = decodeAccountJwt(accessToken);
  if (!claims || Date.now() >= claims.exp * 1000) return NextResponse.json({ user: null });

  return NextResponse.json({ user: claims.user });
}
