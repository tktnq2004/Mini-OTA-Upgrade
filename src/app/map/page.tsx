import { Suspense } from "react";
import Map from "./Map";

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
      <Map />
    </Suspense>
  );
}
