import type { Metadata } from "next";
import { Suspense } from "react";
import HotelsView from "./HotelsView";

export const metadata: Metadata = {
    title: "Danh sách khách sạn",
    description: "Lọc khách sạn khắp Việt Nam theo tỉnh thành, phường xã, ngày ở và vị trí quanh bạn.",
    alternates: { canonical: "/hotels" },
};

export default function HotelsPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <HotelsView />
        </Suspense>
    );
}
