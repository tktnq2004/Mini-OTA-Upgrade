import type { Metadata } from "next";
import { Suspense } from "react";
import SuccessView from "./SuccessView";

export const metadata: Metadata = {
    title: "Đặt phòng thành công",
    robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <SuccessView />
        </Suspense>
    );
}
