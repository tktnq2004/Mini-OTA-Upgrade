"use client";

import { loadStripe, type Stripe, type StripeCardNumberElement } from "@stripe/stripe-js";
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
// { bookingId, paymentMethodId }; backend tự tính số tiền theo booking.
async function createPaymentIntent(bookingId: number, paymentMethodId: string): Promise<string> {
  const res = await fetch("/api/public/payment/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, paymentMethodId }),
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
  // Thẻ mới nhập (ô số thẻ) hoặc id thẻ đã lưu.
  method: { card: StripeCardNumberElement } | { savedCardId: string };
  bookingId: number;
  billing: { name: string; email: string; phone: string };
}

// Thanh toán thẻ cho booking đã tạo:
// 1. Có paymentMethodId: thẻ đã lưu dùng luôn id; thẻ mới nhập (khách vãng
//    lai) thì tạo payment method từ ô thẻ ngay trên trình duyệt (số thẻ không
//    đi qua server mình).
// 2. Gửi { bookingId, paymentMethodId } lên backend -> clientSecret.
// 3. Backend có thể đã tự confirm -> xem trạng thái trước, chưa xong mới
//    confirm ở trình duyệt (thẻ cần 3DS thì cổng tự bật popup xác thực).
export async function payByCard({ stripe, method, bookingId, billing }: PayByCardArgs): Promise<void> {
  let paymentMethodId: string;
  if ("savedCardId" in method) {
    paymentMethodId = method.savedCardId;
  } else {
    const created = await stripe.createPaymentMethod({ type: "card", card: method.card, billing_details: billing });
    if (created.error) throw new CardPaymentError(created.error.message || "");
    paymentMethodId = created.paymentMethod.id;
  }

  const clientSecret = await createPaymentIntent(bookingId, paymentMethodId);

  const current = await stripe.retrievePaymentIntent(clientSecret);
  if (current.paymentIntent?.status === "succeeded") return;

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, { payment_method: paymentMethodId });
  if (error) throw new CardPaymentError(error.message || "");
  if (paymentIntent?.status !== "succeeded") throw new CardPaymentError("");
}
