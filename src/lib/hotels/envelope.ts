// Bóc envelope { statuscode, error, message, data } mà backend bọc quanh mọi
// response — dùng chung cho cả client.ts (fetch qua proxy) và server.ts
// (fetch thẳng backend), khác input là 1 Response đã có sẵn.

export class PublicApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

export async function unwrapResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new PublicApiError(errorMessageFrom(payload, res.statusText), res.status);
  }

  if (payload && typeof payload === "object" && "data" in payload && "statuscode" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
