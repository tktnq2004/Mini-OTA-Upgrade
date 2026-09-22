import { Suspense } from "react";
import type { Metadata } from "next";
import PanoramaReviewView from "@/components/media/review/PanoramaReviewView";

export const metadata: Metadata = {
    title: "Xem panorama 360° — Mini-OTA Admin",
};

export default function PanoramaReviewPage() {
    return (
        <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#000" }} />}>
            <PanoramaReviewView />
        </Suspense>
    );
}
