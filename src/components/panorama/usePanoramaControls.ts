"use client";

import { useEffect, useRef } from "react";

const LOOK_SENSITIVITY = 0.25;
const MAX_LATITUDE = 85;

const DEFAULT_FOV = 75;
const MIN_FOV = 30; // zoom vào tối đa, tránh phóng to quá gây vỡ nét texture
const MAX_FOV = 90; // zoom ra tối đa, giữ dưới ~100 để hạn chế méo rìa khung hình
const WHEEL_SENSITIVITY = 0.05;

interface PointerPos {
    x: number;
    y: number;
}

function distance(a: PointerPos, b: PointerPos): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// Port của useOrbitControls.ts (bản React Native, dùng PanResponder) sang
// Pointer Events — API DOM chuẩn hoá cả chuột/chạm/bút trong cùng một model
// nên không cần tách riêng handler mouse và touch như PanResponder. Chuột
// kéo/chạm 1 ngón để xoay góc nhìn, chạm 2 ngón để zoom (pinch), lăn chuột để
// zoom (không có ở bản gốc — chỉ desktop mới có wheel).
//
// Dùng ref (không phải state) cho lon/lat/fov vì các giá trị này được đọc lại
// mỗi frame trong vòng lặp render của usePanoramaScene — nếu để state sẽ gây
// re-render 60 lần/giây không cần thiết.
export function usePanoramaControls(containerRef: React.RefObject<HTMLElement | null>) {
    const lonRef = useRef(0);
    const latRef = useRef(0);
    const fovRef = useRef(DEFAULT_FOV);

    const pointersRef = useRef(new Map<number, PointerPos>());
    const pinchRef = useRef<{ startDistance: number; startFov: number } | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const getPointers = () => Array.from(pointersRef.current.values());

        const handlePointerDown = (e: PointerEvent) => {
            // Không giành pointer capture khi chạm/click bắt đầu ngay trên một nút
            // (marker hotspot) — setPointerCapture chuyển hướng cả pointerup lẫn
            // click tiếp theo về el (container) bất kể đang ở trên phần tử nào,
            // khiến nút hotspot không bao giờ nhận được click. Đây là bản DOM
            // của đúng vấn đề mà bản React Native đã gặp và giải quyết bằng
            // onStartShouldSetPanResponder: () => false (nhường quyền xử lý tap
            // cho con trước, PanResponder chỉ giành lại khi có chuyển động thật).
            if ((e.target as HTMLElement).closest("button")) return;

            el.setPointerCapture(e.pointerId);
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            pinchRef.current = null;
        };

        const handlePointerMove = (e: PointerEvent) => {
            const prev = pointersRef.current.get(e.pointerId);
            if (!prev) return;

            const current = { x: e.clientX, y: e.clientY };
            pointersRef.current.set(e.pointerId, current);

            if (pointersRef.current.size === 2) {
                const [a, b] = getPointers();
                const dist = distance(a, b);
                if (!pinchRef.current) {
                    pinchRef.current = { startDistance: dist, startFov: fovRef.current };
                } else if (pinchRef.current.startDistance > 0) {
                    // 2 ngón xoè ra (distance tăng) => zoom in => FOV giảm, và ngược lại.
                    const scale = dist / pinchRef.current.startDistance;
                    const nextFov = pinchRef.current.startFov / scale;
                    fovRef.current = Math.max(MIN_FOV, Math.min(MAX_FOV, nextFov));
                }
                return;
            }

            if (pinchRef.current) {
                // Vừa nhấc bớt 1 ngón sau khi pinch — không dùng delta lần này để
                // tránh giật hình do vị trí ngón còn lại đã lệch so với lúc bắt đầu pinch.
                pinchRef.current = null;
                return;
            }

            const dx = current.x - prev.x;
            const dy = current.y - prev.y;

            lonRef.current -= dx * LOOK_SENSITIVITY;
            latRef.current += dy * LOOK_SENSITIVITY;
            latRef.current = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latRef.current));
        };

        const handlePointerUp = (e: PointerEvent) => {
            pointersRef.current.delete(e.pointerId);
            pinchRef.current = null;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const next = fovRef.current + e.deltaY * WHEEL_SENSITIVITY;
            fovRef.current = Math.max(MIN_FOV, Math.min(MAX_FOV, next));
        };

        el.addEventListener("pointerdown", handlePointerDown);
        el.addEventListener("pointermove", handlePointerMove);
        el.addEventListener("pointerup", handlePointerUp);
        el.addEventListener("pointercancel", handlePointerUp);
        // passive:false — cần preventDefault() để lăn chuột zoom panorama thay vì cuộn trang.
        el.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            el.removeEventListener("pointerdown", handlePointerDown);
            el.removeEventListener("pointermove", handlePointerMove);
            el.removeEventListener("pointerup", handlePointerUp);
            el.removeEventListener("pointercancel", handlePointerUp);
            el.removeEventListener("wheel", handleWheel);
        };
    }, [containerRef]);

    return { lonRef, latRef, fovRef };
}
