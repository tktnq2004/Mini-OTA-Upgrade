

import { errorMessageFrom, readEnvelope, unwrapEnvelope } from "@/lib/apiEnvelope";

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
