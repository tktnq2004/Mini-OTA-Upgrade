"use client";

import { useEffect } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { usePanoramaScene } from "./usePanoramaScene";
import HotspotOverlay from "./HotspotOverlay";
import type { HotspotItem } from "./types";
import styles from "./PanoramaCanvas.module.css";

interface PanoramaCanvasProps {
    imageUrl: string;
    hotspots: HotspotItem[];
    onReady?: () => void;
}

// Port của PanoramaViewer.tsx (bản React Native, bọc GLView) — container div
// đóng vai trò GLView, WebGLRenderer tự chèn <canvas> thật vào bên trong qua
// usePanoramaScene. Lớp overlay hotspot vẫn là DOM thường đè lên trên, không
// phải object 3D trong scene, giữ đúng nguyên tắc tách render khỏi UI của bản gốc.
export default function PanoramaCanvas({ imageUrl, hotspots, onReady }: PanoramaCanvasProps) {
    const { containerRef, projectedHotspots, loadError, isReady } = usePanoramaScene({
        imageUrl,
        hotspots,
    });

    useEffect(() => {
        if (isReady) onReady?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady]);

    return (
        <div ref={containerRef} className={styles.container}>
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
