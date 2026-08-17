import type { Marker, Popup } from "maplibre-gl";
import type { Root } from "react-dom/client";
import type { BoundsBox } from "@/lib/geo";

export interface MarkerEntry {
    marker: Marker;
    popup: Popup;
    root: Root;
}

export type ViewMode =
    | { type: "province" }
    | { type: "bounds"; bounds: BoundsBox }
    | { type: "radius"; lat: number; lng: number; radiusKm: number };
