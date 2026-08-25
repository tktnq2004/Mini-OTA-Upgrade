export const ACCESS_COOKIE = "mota_admin_at";
export const REFRESH_COOKIE = "mota_admin_rt";
const BACKEND_REFRESH_COOKIE_NAME = "refresh-token-Mini";

// JWT của backend giờ KHÔNG mang claim role/permission nào đáng tin cả —
// quyền thật được backend tự tra lại từ DB (bảng Role/Permission) ở MỖI
// request qua CustomJwtAuthenticationConverter, dựa trên user.id. Claims ở
// đây chỉ dùng để hiển thị (tên/email) và kiểm tra hết hạn (exp), không
// dùng để tự quyết "user này có phải admin không" — việc đó phải hỏi thật
// backend (xem probeAdminAccess bên dưới).
export interface AdminJwtClaims {
  sub: string;
  user: { id: number; email: string; name: string };
  iat: number;
  exp: number;
}

// Chỉ giải mã payload để đọc thông tin hiển thị — không cần verify chữ ký ở
// đây vì mọi request thật sự vẫn phải qua backend (backend tự verify JWT
// khi FE gọi API qua proxy). Payload JWT là base64url, không mã hoá.
export function decodeAdminJwt(token: string): AdminJwtClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as AdminJwtClaims;
  } catch {
    return null;
  }
}

export function isJwtExpired(claims: AdminJwtClaims): boolean {
  return Date.now() >= claims.exp * 1000;
}

interface ParsedSetCookie {
  value: string;
  maxAgeSeconds?: number;
}

// fetch() (undici) gộp nhiều Set-Cookie thành 1 header string phân tách bởi
// ", " trong Node cũ, nhưng Response hiện đại hỗ trợ getSetCookie() trả về
// mảng riêng biệt — ưu tiên dùng nếu có.
export function extractSetCookie(headers: Headers, cookieName: string): ParsedSetCookie | null {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const rawList = typeof getSetCookie === "function" ? getSetCookie.call(headers) : [headers.get("set-cookie") ?? ""];

  for (const raw of rawList) {
    if (!raw) continue;
    const parts = raw.split(";").map((p) => p.trim());
    const [nameValue, ...attrs] = parts;
    const eqIndex = nameValue.indexOf("=");
    if (eqIndex === -1) continue;
    const name = nameValue.slice(0, eqIndex);
    if (name !== cookieName) continue;
    const value = nameValue.slice(eqIndex + 1);
    const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith("max-age="));
    const maxAgeSeconds = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : undefined;
    return { value, maxAgeSeconds };
  }
  return null;
}

export function extractBackendRefreshCookie(headers: Headers): ParsedSetCookie | null {
  return extractSetCookie(headers, BACKEND_REFRESH_COOKIE_NAME);
}

export function backendRefreshCookieHeader(refreshToken: string): string {
  return `${BACKEND_REFRESH_COOKIE_NAME}=${refreshToken}`;
}

export function getAdminApiBaseUrl(): string {
  const base = process.env.ADMIN_API_BASE_URL;
  if (!base) throw new Error("ADMIN_API_BASE_URL is not configured");
  return base.replace(/\/+$/, "");
}

export interface RefreshResult {
  accessToken: string;
  accessMaxAge: number;
  refreshToken?: string;
  refreshMaxAge?: number;
}

// Backend không đọc cookie qua trình duyệt ở đây (server gọi server), nên
// phải tự gắn header Cookie thủ công bằng refresh token đang lưu ở FE.
export async function refreshBackendSession(refreshToken: string): Promise<RefreshResult | null> {
  const res = await fetch(`${getAdminApiBaseUrl()}/auth/refresh`, {
    method: "GET",
    headers: { Cookie: backendRefreshCookieHeader(refreshToken) },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const envelope = await res.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!accessToken) return null;

  const claims = decodeAdminJwt(accessToken);
  if (!claims) return null;

  const rotated = extractBackendRefreshCookie(res.headers);
  return {
    accessToken,
    accessMaxAge: Math.max(60, claims.exp - Math.floor(Date.now() / 1000)),
    refreshToken: rotated?.value,
    refreshMaxAge: rotated?.maxAgeSeconds,
  };
}

// Không còn cách nào đọc "user này có phải admin không" từ JWT — quyền thật
// nằm trong bảng Role/Permission phía backend, tự tra theo user.id ở mỗi
// request. Cách duy nhất để biết chắc là THỬ gọi 1 endpoint chỉ role admin
// mới có quyền (GET /roles cần authority ROLE_READ, hiện chỉ ROLE_ADMIN có
// sẵn quyền này) — 200 nghĩa là tài khoản có quyền quản trị thật, 403 nghĩa
// là không (đăng nhập đúng mật khẩu nhưng không đủ quyền vào admin).
export async function probeAdminAccess(accessToken: string): Promise<boolean> {
  const res = await fetch(`${getAdminApiBaseUrl()}/roles`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return res.ok;
}
