import type { SessionUser } from "./types";

// Cookie riêng cho khách (public site) — không dùng chung với admin
// (mota_admin_at/mota_admin_rt) để 2 phiên độc lập nhau.
export const ACCESS_COOKIE = "mota_acc_at";
export const REFRESH_COOKIE = "mota_acc_rt";
const BACKEND_REFRESH_COOKIE_NAME = "refresh-token-Mini";

export interface AccountJwtClaims {
  sub: string;
  user: SessionUser;
  iat: number;
  exp: number;
}

// Chỉ giải mã payload để hiển thị — chữ ký được backend tự verify ở mỗi
// request thật qua proxy, không cần verify lại ở đây (xem session.ts bên
// admin, cùng lý do).
export function decodeAccountJwt(token: string): AccountJwtClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as AccountJwtClaims;
  } catch {
    return null;
  }
}

interface ParsedSetCookie {
  value: string;
  maxAgeSeconds?: number;
}

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

// Cùng backend Mini-OTA với admin — dùng chung biến môi trường
// ADMIN_API_BASE_URL (tên còn giữ vì admin dùng trước, nhưng chỉ là base URL
// backend chung, không có gì admin-riêng trong giá trị này).
export function getApiBaseUrl(): string {
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

export async function refreshBackendSession(refreshToken: string): Promise<RefreshResult | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "GET",
    headers: { Cookie: backendRefreshCookieHeader(refreshToken) },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const envelope = await res.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!accessToken) return null;

  const claims = decodeAccountJwt(accessToken);
  if (!claims) return null;

  const rotated = extractBackendRefreshCookie(res.headers);
  return {
    accessToken,
    accessMaxAge: Math.max(60, claims.exp - Math.floor(Date.now() / 1000)),
    refreshToken: rotated?.value,
    refreshMaxAge: rotated?.maxAgeSeconds,
  };
}

export interface OAuth2ExchangeResult {
  status: "LOGIN_SUCCESS" | "REGISTER_REQUIRED";
  accessToken?: string;
  accessMaxAge?: number;
  refreshToken?: string;
  refreshMaxAge?: number;
  sessionId?: string;
  email?: string;
  name?: string;
}

// Đổi 1 lần "handoff code" (backend tạo sau khi Google/Facebook redirect
// login thành công qua Spring Security oauth2Login — xem OAuth2SuccessHandler
// bên backend) lấy access_token thật. Gọi server-to-server nên không đụng
// CORS. Không bao giờ đưa access_token thẳng vào URL redirect cho browser.
export async function exchangeOAuth2Code(code: string): Promise<OAuth2ExchangeResult | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/oauth2/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const envelope = await res.json().catch(() => null);
  const session = envelope?.data?.session;
  if (!session) return null;

  if (session.status === "REGISTER_REQUIRED") {
    return {
      status: "REGISTER_REQUIRED",
      sessionId: session.sessionId,
      email: session.email,
      name: session.name,
    };
  }

  const accessToken: string | undefined = session.accessToken;
  if (!accessToken) return null;

  const claims = decodeAccountJwt(accessToken);
  if (!claims) return null;

  const rotated = extractBackendRefreshCookie(res.headers);
  return {
    status: "LOGIN_SUCCESS",
    accessToken,
    accessMaxAge: Math.max(60, claims.exp - Math.floor(Date.now() / 1000)),
    refreshToken: rotated?.value,
    refreshMaxAge: rotated?.maxAgeSeconds,
  };
}

// POST /auth/session — bước cuối khi user social login lần đầu (chưa có tài
// khoản trong hệ thống), sau khi nhập xong username/phone ở trang
// /complete-profile.
export async function completeProviderProfile(params: {
  sessionId: string;
  username: string;
  phone: string;
}): Promise<RefreshResult | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const envelope = await res.json().catch(() => null);
  const accessToken: string | undefined = envelope?.data?.access_token;
  if (!accessToken) return null;

  const claims = decodeAccountJwt(accessToken);
  if (!claims) return null;

  const rotated = extractBackendRefreshCookie(res.headers);
  return {
    accessToken,
    accessMaxAge: Math.max(60, claims.exp - Math.floor(Date.now() / 1000)),
    refreshToken: rotated?.value,
    refreshMaxAge: rotated?.maxAgeSeconds,
  };
}
