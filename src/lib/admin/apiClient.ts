export class AdminApiError extends Error {
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

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    throw new AdminApiError(errorMessageFrom(payload, res.statusText), res.status, payload);
  }
  return payload as T;
}

export const adminGet = <T>(path: string) => adminFetch<T>(path, { method: "GET" });
export const adminPost = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
export const adminPut = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const adminDelete = <T>(path: string) => adminFetch<T>(path, { method: "DELETE" });
