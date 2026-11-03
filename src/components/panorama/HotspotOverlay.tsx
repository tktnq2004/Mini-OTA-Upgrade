"use client";

import { ArrowRightIcon, InfoIcon } from "@phosphor-icons/react";
import { PeekCard, usePeek } from "./HotspotPeek";
import { useReducedMotion } from "./useReducedMotion";
import type { ProjectedHotspot } from "./types";
import styles from "./HotspotOverlay.module.css";

interface HotspotOverlayProps {
    hotspots: ProjectedHotspot[];
    /** Vòng tròn chuyển cảnh chạy quanh vành (hs.arrow) thay vì nằm tại điểm đích. */
    navArrows?: boolean;
}

// Port của HotspotOverlay.tsx (bản React Native, dùng BlurView + Reanimated)
// — vòng pulse quanh marker và blur dùng CSS thuần (backdrop-filter,
// @keyframes) thay cho thư viện animation riêng. Marker/nhãn cố định màu
// (không theo token theme sáng/tối) vì luôn đè lên ảnh panorama bất kỳ, giống
// quy ước đã dùng cho badge trên RoomCard/HotelCard.
export default function HotspotOverlay({ hotspots, navArrows }: HotspotOverlayProps) {
    return (
        <>
            {hotspots.map((hs) => {
                const show = navArrows && hs.type === "NAVIGATION" ? Boolean(hs.arrow) : hs.visible;
                return show ? <HotspotMarker key={hs.id} hotspot={hs} /> : null;
            })}
        </>
    );
}

function HotspotMarker({ hotspot }: { hotspot: ProjectedHotspot }) {
    const reducedMotion = useReducedMotion();
    const isInfo = hotspot.type === "INFO";
    const { isPeeking, peekHandlers } = usePeek(hotspot);

    return (
        <div
            className={hotspot.selected ? styles.wrapperSelected : styles.wrapper}
            style={{ left: hotspot.arrow?.x ?? hotspot.screenX, top: hotspot.arrow?.y ?? hotspot.screenY }}
        >
            {isPeeking && <PeekCard hotspot={hotspot} />}

            <button
                type="button"
                className={styles.markerButton}
                data-hotspot-id={hotspot.id}
                onClick={hotspot.onPress}
                {...peekHandlers}
            >
                <span className={styles.markerAnchor}>
                    {!reducedMotion && (
                        <span className={isInfo ? styles.pulseRingInfo : styles.pulseRingNav} />
                    )}
                    <span className={isInfo ? styles.markerInfo : styles.markerNav}>
                        {isInfo ? (
                            <InfoIcon size={17} weight="bold" />
                        ) : (
                            // Icon gốc chỉ sang phải, nên góc xoay chính là góc trên màn hình.
                            <ArrowRightIcon
                                size={20}
                                weight="regular"
                                style={hotspot.arrow && { transform: `rotate(${hotspot.arrow.angle}deg)` }}
                            />
                        )}
                    </span>
                </span>
                <span className={hotspot.arrow?.rear ? styles.labelChipRear : styles.labelChip}>{hotspot.name}</span>
            </button>
        </div>
    );
}
