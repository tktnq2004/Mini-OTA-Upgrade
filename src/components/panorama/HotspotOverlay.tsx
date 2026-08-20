"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, InfoIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useReducedMotion } from "./useReducedMotion";
import type { ProjectedHotspot } from "./types";
import styles from "./HotspotOverlay.module.css";

const HOLD_THRESHOLD_MS = 500;

interface HotspotOverlayProps {
    hotspots: ProjectedHotspot[];
}

// Port của HotspotOverlay.tsx (bản React Native, dùng BlurView + Reanimated)
// — vòng pulse quanh marker và blur dùng CSS thuần (backdrop-filter,
// @keyframes) thay cho thư viện animation riêng. Marker/nhãn cố định màu
// (không theo token theme sáng/tối) vì luôn đè lên ảnh panorama bất kỳ, giống
// quy ước đã dùng cho badge trên RoomCard/HotelCard.
export default function HotspotOverlay({ hotspots }: HotspotOverlayProps) {
    return (
        <>
            {hotspots.map((hs) =>
                hs.visible ? <HotspotMarker key={hs.id} hotspot={hs} /> : null
            )}
        </>
    );
}

function HotspotMarker({ hotspot }: { hotspot: ProjectedHotspot }) {
    const reducedMotion = useReducedMotion();
    const isInfo = hotspot.type === "INFO";
    const canPeek = !isInfo && Boolean(hotspot.previewImageUrl);

    const [isPeeking, setIsPeeking] = useState(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        };
    }, []);

    const startPeekTimer = () => {
        if (!canPeek) return;
        holdTimerRef.current = setTimeout(() => setIsPeeking(true), HOLD_THRESHOLD_MS);
    };

    const clearPeek = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setIsPeeking(false);
    };

    // Chuột: hiện xem trước ngay khi hover, không cần giữ. Chạm: giữ ngón tay
    // (long-press ~500ms) mới hiện, khớp quy ước long-press chuẩn của di động.
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") startPeekTimer();
    };

    return (
        <div
            className={styles.wrapper}
            style={{ left: hotspot.screenX, top: hotspot.screenY }}
        >
            {isPeeking && canPeek && (
                <div className={styles.peekCard}>
                    <ImageWithFallback
                        src={hotspot.previewImageUrl as string}
                        alt={hotspot.previewLabel ?? hotspot.name}
                        className={styles.peekImage}
                        fallbackClassName={styles.peekImageFallback}
                        fallback={<ArrowRightIcon size={16} weight="light" />}
                    />
                </div>
            )}

            <button
                type="button"
                className={styles.markerButton}
                onClick={hotspot.onPress}
                onMouseEnter={() => canPeek && setIsPeeking(true)}
                onMouseLeave={clearPeek}
                onPointerDown={handlePointerDown}
                onPointerUp={clearPeek}
                onPointerCancel={clearPeek}
            >
                <span className={styles.markerAnchor}>
                    {!reducedMotion && (
                        <span className={isInfo ? styles.pulseRingInfo : styles.pulseRingNav} />
                    )}
                    <span className={isInfo ? styles.markerInfo : styles.markerNav}>
                        {isInfo ? <InfoIcon size={17} weight="bold" /> : <ArrowRightIcon size={17} weight="bold" />}
                    </span>
                </span>
                <span className={styles.labelChip}>{hotspot.name}</span>
            </button>
        </div>
    );
}
