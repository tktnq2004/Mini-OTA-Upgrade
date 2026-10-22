// Client cho API công khai (qua proxy /api/public): bóc envelope backend,
// lỗi thì ném PublicApiError (message đọc được + HTTP status). Dùng chung cho
// khách sạn, booking, thanh toán... — không riêng gì lib/hotels.
import { errorMessageFrom, readEnvelope, unwrapEnvelope } from "@/lib/api/envelope";

export class PublicApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function unwrapResponse<T>(res: Response): Promise<T> {
  const payload = await readEnvelope(res);

  if (!res.ok) {
    throw new PublicApiError(errorMessageFrom(payload, res.statusText), res.status);
  }

  return unwrapEnvelope<T>(payload);
}

// GET qua proxy /api/public (trình duyệt -> Next -> backend), không cache.
export async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/public/${path}`, { cache: "no-store" });
  return unwrapResponse<T>(res);
}
