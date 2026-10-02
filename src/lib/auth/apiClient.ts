export class AccountApiError extends Error {
  status: number;
  payload: unknown;
  // Chỉ có giá trị ở lỗi 429 (gửi OTP quá nhanh) — số giây còn lại trước khi
  // được gửi lại, lấy từ RestResponse.data.retryAfter (xem
  // Global_exception.too_many_request bên backend).
  retryAfter?: number;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    if (payload && typeof payload === "object" && "data" in payload) {
      const data = (payload as { data: unknown }).data;
      if (data && typeof data === "object" && "retryAfter" in data) {
        const retryAfter = (data as { retryAfter: unknown }).retryAfter;
        if (typeof retryAfter === "number") this.retryAfter = retryAfter;
      }
    }
  }
}

function errorMessageFrom(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as { error: unknown }).error;
    if (Array.isArray(err)) return err.join(", ");
    if (typeof err === "string") return err;
  }
  if (payload && typeof payload === "object" && "message" in payload) {
    const msg = (payload as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
}

export async function accountFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/account/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new AccountApiError(errorMessageFrom(payload, res.statusText), res.status, payload);
  }

  if (payload && typeof payload === "object" && "data" in payload && "statuscode" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const accountGet = <T>(path: string) => accountFetch<T>(path, { method: "GET" });
export const accountPost = <T>(path: string, body: unknown) =>
  accountFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
export const accountPut = <T>(path: string, body: unknown) =>
  accountFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
