"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { Map as MapLibreMap, Marker, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { hotels, type Hotel } from "../data/hotels.data";

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://api.maptiler.com/maps/019fbdda-12e2-7c5a-966f-6c8de6b48a1c/style.json?key=njTc0NudANwT2b4P8y7j",
      center: [106.7009, 10.7769],
      zoom: 12.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");

    hotels.forEach((hotel: Hotel) => {
      const popupHTML = `
      <div style="width: 200px;">
        <img src="${hotel.thumbnail}" style="width:100%; height:100px; object-fit:cover; border-radius:4px;" />
        <h4 style="margin:8px 0 4px; font-size:14px;">${hotel.name}</h4>
        <p style="margin:0; font-size:12px; color:#666;">${hotel.address}</p>
        <button>Book now</button>
      </div>
    `;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupHTML)

      const marker = new maplibregl.Marker({ color: "#e11d48" })
        .setLngLat([hotel.lng, hotel.lat])
        .setPopup(popup)
        .addTo(map);

      
    })

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

      </div>
    </div>
  );
}
