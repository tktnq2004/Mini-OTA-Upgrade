import type { Metadata } from "next";
import { Suspense } from "react";
import PaymentView from "./PaymentView";

export const metadata: Metadata = {
    title: "Hoàn tất thanh toán",
    robots: { index: false, follow: false },
};

export default function CheckoutPaymentPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <PaymentView />
        </Suspense>
    );
}
