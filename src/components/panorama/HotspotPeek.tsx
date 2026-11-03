"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import type { ProjectedHotspot } from "./types";
import styles from "./HotspotOverlay.module.css";

const HOLD_THRESHOLD_MS = 500;

// Xem trước cảnh đích của hotspot chuyển cảnh. Chuột: hiện ngay khi hover. Chạm: giữ
// ngón tay (long-press ~500ms) mới hiện, khớp quy ước long-press chuẩn của di động.
export function usePeek(hotspot: ProjectedHotspot) {
    const canPeek = hotspot.type === "NAVIGATION" && Boolean(hotspot.previewImageUrl);
    const [isPeeking, setIsPeeking] = useState(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        };
    }, []);

    const clearPeek = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setIsPeeking(false);
    };

    return {
        isPeeking: isPeeking && canPeek,
        peekHandlers: {
            onMouseEnter: () => canPeek && setIsPeeking(true),
            onMouseLeave: clearPeek,
            onPointerDown: (e: React.PointerEvent) => {
                if (canPeek && (e.pointerType === "touch" || e.pointerType === "pen")) {
                    holdTimerRef.current = setTimeout(() => setIsPeeking(true), HOLD_THRESHOLD_MS);
                }
            },
            onPointerUp: clearPeek,
            onPointerCancel: clearPeek,
        },
    };
}

export function PeekCard({ hotspot }: { hotspot: ProjectedHotspot }) {
    return (
        <div className={styles.peekCard}>
            {/* Viewer mở mọi cảnh ở yaw 0 = mép ảnh equirect: ghép 2 mép ảnh để thẻ
                xem trước đúng hướng khách sẽ thấy khi vào cảnh đó. crossOrigin: bấm
                hotspot thì three.js nạp lại đúng ảnh này bằng CORS (xem ImageWithFallback). */}
            <ImageWithFallback
                src={hotspot.previewImageUrl as string}
                alt={hotspot.previewLabel ?? hotspot.name}
                className={styles.peekImageEnd}
                crossOrigin="anonymous"
                fallbackClassName={styles.peekImageFallback}
                fallback={<ArrowRightIcon size={16} weight="light" />}
            />
            <ImageWithFallback
                src={hotspot.previewImageUrl as string}
                alt=""
                className={styles.peekImageStart}
                crossOrigin="anonymous"
                fallbackClassName={styles.peekImageFallback}
                fallback={null}
            />
        </div>
    );
}
