"use client";

import { loadStripe, type ConfirmCardPaymentData, type Stripe, type StripeCardNumberElement } from "@stripe/stripe-js";
import { PublicApiError, unwrapResponse } from "@/lib/hotels/envelope";
import { AccountApiError, accountFetch } from "@/lib/auth/apiClient";

// Cổng thanh toán thẻ. Khoá công khai thiếu -> null, ô thẻ hiện thông báo
// "chưa hỗ trợ" thay vì lỗi.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// Tắt bảng "Developer Tools" mà cổng tự chèn vào trang ở chế độ test.
export const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey, { developerTools: { assistant: { enabled: false } } })
  : null;

export class CardPaymentError extends Error {}

// data trả về có thể là chuỗi clientSecret hoặc object chứa nó.
function pickClientSecret(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as { clientSecret?: unknown; client_secret?: unknown };
    const secret = d.clientSecret ?? d.client_secret;
    if (typeof secret === "string") return secret;
  }
  return null;
}

// POST /api/v1/payment/create-payment-intent (qua proxy /api/public, tự gắn
// token nếu đã đăng nhập). Body khớp ReqCreatePaymentIntentDTO
// { bookingId, paymentMethodId, saveCard }; backend tự tính số tiền theo booking.
// paymentMethodId = null: thẻ mới nhập, trình duyệt tự confirm với ô thẻ;
// saveCard = true: backend đặt setup_future_usage để lưu thẻ sau khi trả.
async function createPaymentIntent(
  bookingId: number,
  paymentMethodId: string | null,
  saveCard: boolean,
): Promise<string> {
  const res = await fetch("/api/public/payment/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, paymentMethodId, saveCard }),
  });
  try {
    const secret = pickClientSecret(await unwrapResponse<unknown>(res));
    if (!secret) throw new CardPaymentError("");
    return secret;
  } catch (err) {
    if (err instanceof PublicApiError) throw new CardPaymentError(err.message);
    throw err;
  }
}

// Thẻ đã lưu của user (id = payment method id bên cổng thanh toán).
export interface SavedCard {
  id: string;
  brand: string; // "visa" | "mastercard" | "amex" | "jcb" | ...
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
}

// GET /payment/payment-methods (qua proxy /api/account, cần đăng nhập) — các
// thẻ user đã thêm qua "Thêm thẻ" (SetupIntent).
export async function listSavedCards(): Promise<SavedCard[]> {
  const data = await accountFetch<SavedCard[] | null>("payment/payment-methods", { method: "GET" });
  return Array.isArray(data) ? data : [];
}

// POST /payment/payment-methods/setup (qua proxy /api/account, cần đăng nhập)
// -> clientSecret của SetupIntent để lưu 1 thẻ mới vào tài khoản.
export async function createCardSetup(): Promise<string> {
  try {
    const secret = pickClientSecret(await accountFetch<unknown>("payment/payment-methods/setup", { method: "POST" }));
    if (!secret) throw new CardPaymentError("");
    return secret;
  } catch (err) {
    if (err instanceof AccountApiError) throw new CardPaymentError(err.message);
    throw err;
  }
}

// DELETE /payment/payment-methods/{id} (qua proxy /api/account) — gỡ thẻ đã lưu.
export async function removeSavedCard(id: string): Promise<void> {
  try {
    await accountFetch<unknown>(`payment/payment-methods/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof AccountApiError) throw new CardPaymentError(err.message);
    throw err;
  }
}

interface PayByCardArgs {
  stripe: Stripe;
  // Thẻ mới nhập (ô số thẻ, save = lưu luôn vào tài khoản) hoặc id thẻ đã lưu.
  method: { card: StripeCardNumberElement; save?: boolean } | { savedCardId: string };
  bookingId: number;
  billing: { name: string; email: string; phone: string };
}

// Thanh toán thẻ cho booking đã tạo:
// - Thẻ đã lưu: gửi { bookingId, paymentMethodId, saveCard: false } -> clientSecret.
//   Backend có thể đã tự confirm -> xem trạng thái trước, chưa xong mới
//   confirm ở trình duyệt (thẻ cần 3DS thì cổng tự bật popup xác thực).
// - Thẻ mới nhập: gửi { paymentMethodId: null, saveCard: tick "Lưu thẻ" } ->
//   clientSecret, rồi confirm ở trình duyệt thẳng với ô thẻ (số thẻ không đi
//   qua server mình).
export async function payByCard({ stripe, method, bookingId, billing }: PayByCardArgs): Promise<void> {
  if ("savedCardId" in method) {
    const clientSecret = await createPaymentIntent(bookingId, method.savedCardId, false);
    const current = await stripe.retrievePaymentIntent(clientSecret);
    if (current.paymentIntent?.status === "succeeded") return;
    await confirm(stripe, clientSecret, { payment_method: method.savedCardId });
    return;
  }

  const clientSecret = await createPaymentIntent(bookingId, null, Boolean(method.save));
  await confirm(stripe, clientSecret, { payment_method: { card: method.card, billing_details: billing } });
}

async function confirm(stripe: Stripe, clientSecret: string, data: ConfirmCardPaymentData): Promise<void> {
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, data);
  if (error) throw new CardPaymentError(error.message || "");
  if (paymentIntent?.status !== "succeeded") throw new CardPaymentError("");
}
