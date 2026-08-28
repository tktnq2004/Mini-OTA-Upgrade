export class AccountApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
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

// Gọi qua /api/account/* (proxy) — KHÔNG tự redirect khi 401 như adminFetch,
// vì trang công khai vẫn phải xem được khi chưa đăng nhập (đá thẳng về
// /login sẽ phá luôn trải nghiệm duyệt web không cần tài khoản).
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
