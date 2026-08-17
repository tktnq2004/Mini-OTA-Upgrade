export const ACCESS_COOKIE = "mota_admin_at";
export const REFRESH_COOKIE = "mota_admin_rt";
const BACKEND_REFRESH_COOKIE_NAME = "refresh-token-Mini";

export interface AdminJwtClaims {
  sub: string;
  role: string;
  user: { id: number; email: string; name: string };
  iat: number;
  exp: number;
}

// Chỉ giải mã payload để đọc role/thông tin hiển thị — không cần verify chữ
// ký ở đây vì mọi request thật sự vẫn phải qua backend (backend tự verify
// JWT khi FE gọi API qua proxy). Payload JWT là base64url, không mã hoá.
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

  const data = await res.json().catch(() => null);
  if (!data?.access_token) return null;

  const claims = decodeAdminJwt(data.access_token);
  if (!claims) return null;

  const rotated = extractBackendRefreshCookie(res.headers);
  return {
    accessToken: data.access_token,
    accessMaxAge: Math.max(60, claims.exp - Math.floor(Date.now() / 1000)),
    refreshToken: rotated?.value,
    refreshMaxAge: rotated?.maxAgeSeconds,
  };
}
