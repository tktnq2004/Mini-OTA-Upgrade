"use client";

import { useEffect } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { pickToYawPitch } from "@/lib/tour/geometry";
import { usePanoramaScene } from "./usePanoramaScene";
import HotspotOverlay from "./HotspotOverlay";
import type { HotspotItem } from "./types";
import styles from "./PanoramaCanvas.module.css";

// Kéo quá ngưỡng này (px) giữa pointerdown và pointerup thì coi là xoay góc
// nhìn, không phải một cú bấm để chọn điểm.
const CLICK_MOVE_TOLERANCE_PX = 5;

interface PanoramaCanvasProps {
    imageUrl: string;
    hotspots: HotspotItem[];
    onReady?: () => void;
    /** Editor: bấm (không kéo) lên ảnh -> trả yaw/pitch của điểm đó trên mặt cầu. */
    onPick?: (yaw: number, pitch: number) => void;
    /** Editor: xoay camera tới góc này; đổi `key` để xoay lại đúng cùng góc lần nữa. */
    lookAt?: { yaw: number; pitch: number; key: number };
    /** Con trỏ dạng ngắm khi đang chờ người dùng bấm đặt điểm. */
    crosshair?: boolean;
}

// Port của PanoramaViewer.tsx (bản React Native, bọc GLView) — container div
// đóng vai trò GLView, WebGLRenderer tự chèn <canvas> thật vào bên trong qua
// usePanoramaScene. Lớp overlay hotspot vẫn là DOM thường đè lên trên, không
// phải object 3D trong scene, giữ đúng nguyên tắc tách render khỏi UI của bản gốc.
export default function PanoramaCanvas({ imageUrl, hotspots, onReady, onPick, lookAt, crosshair }: PanoramaCanvasProps) {
    const { containerRef, projectedHotspots, loadError, isReady, lonRef, latRef, fovRef } = usePanoramaScene({
        imageUrl,
        hotspots,
    });

    useEffect(() => {
        if (isReady) onReady?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady]);

    useEffect(() => {
        if (!lookAt) return;
        lonRef.current = lookAt.yaw;
        latRef.current = Math.max(-85, Math.min(85, lookAt.pitch));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lookAt?.key]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !onPick) return;

        let down: { x: number; y: number } | null = null;

        const handleDown = (e: PointerEvent) => {
            // Bấm trúng nút hotspot thì để nút tự xử lý, không coi là đặt điểm mới.
            down = (e.target as HTMLElement).closest("button") ? null : { x: e.clientX, y: e.clientY };
        };
        const handleUp = (e: PointerEvent) => {
            if (!down) return;
            const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
            down = null;
            if (moved > CLICK_MOVE_TOLERANCE_PX) return;

            const rect = el.getBoundingClientRect();
            const { yaw, pitch } = pickToYawPitch({
                lon: lonRef.current,
                lat: latRef.current,
                fov: fovRef.current,
                width: rect.width,
                height: rect.height,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
            onPick(yaw, pitch);
        };

        el.addEventListener("pointerdown", handleDown);
        el.addEventListener("pointerup", handleUp);
        return () => {
            el.removeEventListener("pointerdown", handleDown);
            el.removeEventListener("pointerup", handleUp);
        };
    }, [containerRef, onPick, lonRef, latRef, fovRef]);

    return (
        <div ref={containerRef} className={styles.container} style={crosshair ? { cursor: "crosshair" } : undefined}>
            <HotspotOverlay hotspots={projectedHotspots} />

            {loadError && (
                <div className={styles.errorOverlay}>
                    <WarningIcon size={32} weight="light" />
                    <p>{loadError}</p>
                </div>
            )}
        </div>
    );
}
