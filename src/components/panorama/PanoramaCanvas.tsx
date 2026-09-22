"use client";

import { useCallback, useEffect, useImperativeHandle } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { normalizeYaw, pickToYawPitch } from "@/lib/tour/geometry";
import { usePanoramaScene } from "./usePanoramaScene";
import { DEFAULT_FOV, MAX_FOV, MIN_FOV } from "./usePanoramaControls";
import HotspotOverlay from "./HotspotOverlay";
import type { HotspotItem } from "./types";
import styles from "./PanoramaCanvas.module.css";

// Kéo quá ngưỡng này (px) giữa pointerdown và pointerup thì coi là xoay góc
// nhìn / kéo hotspot, không phải một cú bấm.
const CLICK_MOVE_TOLERANCE_PX = 5;

/** Điều khiển góc nhìn từ bên ngoài (editor): zoom, đặt lại, đọc góc hiện tại. */
export interface PanoramaViewHandle {
    /** Cộng `deltaFov` độ vào FOV (âm = phóng to). Tự chặn trong khoảng cho phép. */
    zoom: (deltaFov: number) => void;
    reset: () => void;
    getView: () => { yaw: number; pitch: number; fov: number };
}

export interface PanoramaPoint {
    yaw: number;
    pitch: number;
}

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
    /** Editor: nhận điều khiển góc nhìn (zoom/đặt lại/đọc góc). */
    ref?: React.Ref<PanoramaViewHandle>;
    /** Editor: toạ độ yaw/pitch dưới con trỏ (null khi con trỏ rời ảnh). */
    onHover?: (point: PanoramaPoint | null) => void;
    /** Editor: cho phép kéo marker hotspot tới vị trí mới; gọi liên tục khi kéo. */
    onMoveHotspot?: (id: string, yaw: number, pitch: number) => void;
}

// Port của PanoramaViewer.tsx (bản React Native, bọc GLView) — container div
// đóng vai trò GLView, WebGLRenderer tự chèn <canvas> thật vào bên trong qua
// usePanoramaScene. Lớp overlay hotspot vẫn là DOM thường đè lên trên, không
// phải object 3D trong scene, giữ đúng nguyên tắc tách render khỏi UI của bản gốc.
// Các prop của editor (onPick, ref, onHover, onMoveHotspot...) đều tuỳ chọn:
// viewer công khai không truyền thì hành vi y như cũ.
export default function PanoramaCanvas({
    imageUrl,
    hotspots,
    onReady,
    onPick,
    lookAt,
    crosshair,
    ref,
    onHover,
    onMoveHotspot,
}: PanoramaCanvasProps) {
    const { containerRef, projectedHotspots, loadError, isReady, lonRef, latRef, fovRef } = usePanoramaScene({
        imageUrl,
        hotspots,
    });

    useImperativeHandle(
        ref,
        () => ({
            zoom: (deltaFov) => {
                fovRef.current = Math.max(MIN_FOV, Math.min(MAX_FOV, fovRef.current + deltaFov));
            },
            reset: () => {
                lonRef.current = 0;
                latRef.current = 0;
                fovRef.current = DEFAULT_FOV;
            },
            getView: () => ({ yaw: normalizeYaw(lonRef.current), pitch: latRef.current, fov: fovRef.current }),
        }),
        [lonRef, latRef, fovRef]
    );

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

    // Điểm (px màn hình) -> yaw/pitch trên mặt cầu, theo góc nhìn hiện tại.
    const pickAt = useCallback(
        (clientX: number, clientY: number): PanoramaPoint | null => {
            const el = containerRef.current;
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return pickToYawPitch({
                lon: lonRef.current,
                lat: latRef.current,
                fov: fovRef.current,
                width: rect.width,
                height: rect.height,
                x: clientX - rect.left,
                y: clientY - rect.top,
            });
        },
        [containerRef, lonRef, latRef, fovRef]
    );

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

            const point = pickAt(e.clientX, e.clientY);
            if (point) onPick(point.yaw, point.pitch);
        };

        el.addEventListener("pointerdown", handleDown);
        el.addEventListener("pointerup", handleUp);
        return () => {
            el.removeEventListener("pointerdown", handleDown);
            el.removeEventListener("pointerup", handleUp);
        };
    }, [containerRef, onPick, pickAt]);

    // Toạ độ dưới con trỏ — gộp theo khung hình để không bắn sự kiện quá dày.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !onHover) return;

        let frame = 0;
        let last: { x: number; y: number } | null = null;

        const handleMove = (e: PointerEvent) => {
            last = { x: e.clientX, y: e.clientY };
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (last) onHover(pickAt(last.x, last.y));
            });
        };
        const handleLeave = () => {
            last = null;
            onHover(null);
        };

        el.addEventListener("pointermove", handleMove);
        el.addEventListener("pointerleave", handleLeave);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            el.removeEventListener("pointermove", handleMove);
            el.removeEventListener("pointerleave", handleLeave);
        };
    }, [containerRef, onHover, pickAt]);

    // Kéo marker hotspot: pointerdown trên marker (data-hotspot-id) rồi di chuyển quá
    // ngưỡng thì bắt đầu kéo; pointermove/up nghe trên window để kéo ra ngoài marker vẫn
    // mượt. Kéo xong nuốt cú click sinh ra sau pointerup để không bị coi là "chọn hotspot".
    // Điều khiển xoay không tranh chấp: nó bỏ qua pointerdown bắt đầu trên nút.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !onMoveHotspot) return;

        let drag: { id: string; x: number; y: number; active: boolean } | null = null;

        const handleDown = (e: PointerEvent) => {
            const marker = (e.target as HTMLElement).closest<HTMLElement>("[data-hotspot-id]");
            if (!marker || e.button !== 0) return;
            drag = { id: marker.dataset.hotspotId as string, x: e.clientX, y: e.clientY, active: false };
        };
        const handleMove = (e: PointerEvent) => {
            if (!drag) return;
            if (!drag.active) {
                if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= CLICK_MOVE_TOLERANCE_PX) return;
                drag.active = true;
                el.setAttribute("data-dragging", "");
            }
            const point = pickAt(e.clientX, e.clientY);
            if (point) onMoveHotspot(drag.id, point.yaw, point.pitch);
        };
        const handleUp = () => {
            if (drag?.active) {
                const swallow = (ev: Event) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                };
                el.addEventListener("click", swallow, { capture: true, once: true });
                window.setTimeout(() => el.removeEventListener("click", swallow, true), 0);
            }
            el.removeAttribute("data-dragging");
            drag = null;
        };

        el.addEventListener("pointerdown", handleDown);
        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);
        return () => {
            el.removeEventListener("pointerdown", handleDown);
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleUp);
            el.removeAttribute("data-dragging");
        };
    }, [containerRef, onMoveHotspot, pickAt]);

    return (
        <div
            ref={containerRef}
            className={styles.container}
            style={crosshair ? { cursor: "crosshair" } : undefined}
            data-editing={onMoveHotspot ? "" : undefined}
        >
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
