"use client";

// File: app/map/page.tsx
// Demo Next.js sử dụng MapLibre GL JS để hiển thị bản đồ tương tác.
//
// CÀI ĐẶT (chạy trong thư mục project Next.js của bạn):
//   npm install maplibre-gl
//
// Sau đó copy file này vào: app/map/page.tsx (nếu dùng App Router)
// hoặc pages/map.tsx (nếu dùng Pages Router, bỏ dòng "use client").
//
// Chạy thử: npm run dev, rồi mở http://localhost:3000/map

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(
    null
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://api.maptiler.com/maps/019fbdda-12e2-7c5a-966f-6c8de6b48a1c/style.json?key=njTc0NudANwT2b4P8y7j",
      center: [105.84117, 21.0245],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");

    const marker = new maplibregl.Marker({ color: "#e11d48" })
      .setLngLat([105.84117, 21.0245])
      .setPopup(
        new maplibregl.Popup().setHTML("<strong>Xin chào!</strong><br/>Đây là marker demo.")
      )
      .addTo(map);
    markerRef.current = marker;

    map.on("click", (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      setCoords({ lng, lat });
      marker.setLngLat([lng, lat]);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%" }}
      />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          background: "white",
          padding: "10px 14px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontFamily: "sans-serif",
          fontSize: 14,
          maxWidth: 260,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>MapLibre Demo</div>
        <div>Nhấp vào bản đồ để đặt marker.</div>
        {coords && (
          <div style={{ marginTop: 6, color: "#374151" }}>
            Lng: {coords.lng.toFixed(5)} <br />
            Lat: {coords.lat.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}
