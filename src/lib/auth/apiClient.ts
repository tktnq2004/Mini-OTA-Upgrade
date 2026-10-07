import { errorMessageFrom, readEnvelope, unwrapEnvelope } from "@/lib/apiEnvelope";

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

export async function accountFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/account/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });

  const payload = await readEnvelope(res);

  if (!res.ok) {
    throw new AccountApiError(errorMessageFrom(payload, res.statusText), res.status, payload);
  }

  return unwrapEnvelope<T>(payload);
}

export const accountGet = <T>(path: string) => accountFetch<T>(path, { method: "GET" });
export const accountPost = <T>(path: string, body: unknown) =>
  accountFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
export const accountPut = <T>(path: string, body: unknown) =>
  accountFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
