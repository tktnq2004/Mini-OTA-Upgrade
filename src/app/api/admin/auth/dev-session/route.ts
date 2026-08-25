import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/admin/session";

// CHỈ dùng khi phát triển giao diện /admin mà không cần chạy backend Java
// thật. Tạo một access token GIẢ (không gọi /auth/login) để qua được guard
// ở admin/(dashboard)/layout.tsx và xem/sửa layout. Mọi lệnh gọi CRUD thật
// qua proxy /api/admin/[...path] vẫn sẽ 401 vì backend không công nhận
// token này — route này chỉ tồn tại ở môi trường dev, không hoạt động khi
// NODE_ENV=production.
function base64url(input: object): string {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Không khả dụng ở production" }, { status: 404 });
  }

  const header = base64url({ alg: "none", typ: "JWT" });
  const payload = base64url({
    sub: "dev@local",
    user: { id: 0, email: "dev@local", name: "Dev (giả lập)" },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const fakeToken = `${header}.${payload}.dev`;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, fakeToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  return res;
}
