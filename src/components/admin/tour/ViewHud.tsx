"use client";

import { useEffect, useState } from "react";
import type { PanoramaViewHandle } from "@/components/panorama/PanoramaCanvas";
import { subscribeCursor, type CursorPoint } from "./hudBus";
import styles from "./TourEditor.module.css";

interface ViewHudProps {
  viewRef: React.RefObject<PanoramaViewHandle | null>;
}

const fmt = (n: number) => `${n >= 0 ? "" : "−"}${Math.abs(n).toFixed(1)}°`;

// Thanh số liệu nhỏ ở góc dưới ảnh: hướng nhìn hiện tại (yaw/pitch), độ zoom (FOV) và toạ độ
// dưới con trỏ — đúng con số sẽ được lưu khi bấm đặt hotspot. Tự đọc góc nhìn định kỳ và
// nhận toạ độ con trỏ qua hudBus nên không làm TourEditor render lại.
export default function ViewHud({ viewRef }: ViewHudProps) {
  const [view, setView] = useState<{ yaw: number; pitch: number; fov: number } | null>(null);
  const [cursor, setCursor] = useState<CursorPoint | null>(null);

  useEffect(() => {
    const read = () => setView(viewRef.current?.getView() ?? null);
    const timer = window.setInterval(read, 120);
    const unsubscribe = subscribeCursor(setCursor);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [viewRef]);

  if (!view) return null;

  return (
    <div className={styles.hud} aria-label="Góc nhìn hiện tại">
      <span className={styles.hudItem}>
        <span className={styles.hudLabel}>Hướng nhìn</span>
        {fmt(view.yaw)} · {fmt(view.pitch)}
      </span>
      <span className={styles.hudItem}>
        <span className={styles.hudLabel}>FOV</span>
        {Math.round(view.fov)}°
      </span>
      {cursor && (
        <span className={styles.hudItemAccent}>
          <span className={styles.hudLabel}>Con trỏ</span>
          {fmt(cursor.yaw)} · {fmt(cursor.pitch)}
        </span>
      )}
    </div>
  );
}
