import { errorMessageFrom, readEnvelope, unwrapEnvelope } from "@/lib/apiEnvelope";

export class AdminApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

// Backend trả lỗi 409 (Confict) dưới dạng { error: string | string[] } — gom về mảng
// dòng để hiển thị thành danh sách (vd. các hotspot sẽ mất khi xoá panorama/phòng).
export function conflictLines(e: AdminApiError): string[] {
  const err = (e.payload as { error?: unknown } | null)?.error;
  if (Array.isArray(err)) return err.map(String);
  return [typeof err === "string" ? err : e.message];
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });

  const payload = await readEnvelope(res);

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    throw new AdminApiError(errorMessageFrom(payload, res.statusText), res.status, payload);
  }

  return unwrapEnvelope<T>(payload);
}

export const adminGet = <T>(path: string) => adminFetch<T>(path, { method: "GET" });
export const adminPost = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
export const adminPut = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const adminDelete = <T>(path: string) => adminFetch<T>(path, { method: "DELETE" });
