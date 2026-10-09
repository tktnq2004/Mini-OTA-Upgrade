import type { Metadata } from "next";
import { Suspense } from "react";
import Map from "./Map";

export const metadata: Metadata = {
    title: "Bản đồ khách sạn",
    description: "Xem giá từng khách sạn ngay trên bản đồ, tìm chỗ ở quanh vị trí của bạn.",
    alternates: { canonical: "/map" },
};

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
      <Map />
    </Suspense>
  );
}
