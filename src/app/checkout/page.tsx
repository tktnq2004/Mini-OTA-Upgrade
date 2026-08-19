import { Suspense } from "react";
import CheckoutView from "./CheckoutView";

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <CheckoutView />
        </Suspense>
    );
}
