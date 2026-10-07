
import { unwrapResponse } from "./envelope";

export async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/public/${path}`, { cache: "no-store" });
  return unwrapResponse<T>(res);
}
