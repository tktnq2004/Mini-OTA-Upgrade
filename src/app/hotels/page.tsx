import { Suspense } from "react";
import HotelsView from "./HotelsView";

export default function HotelsPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <HotelsView />
        </Suspense>
    );
}
