export function errorMessageFrom(payload: unknown, fallback: string): string {
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

export async function readEnvelope(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const contentType = res.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? res.json().catch(() => null) : null;
}

export function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload && "statuscode" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
