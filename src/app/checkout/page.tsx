import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutView from "./CheckoutView";

export const metadata: Metadata = {
    title: "Thanh toán",
    robots: { index: false, follow: false },
};

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <CheckoutView />
        </Suspense>
    );
}
