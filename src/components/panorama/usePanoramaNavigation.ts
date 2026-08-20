"use client";

import { useMemo, useState } from "react";
import type { PanoramaHotspot, PanoramaScene, PanoramaTour } from "./types";

interface UsePanoramaNavigationParams {
    tour: PanoramaTour;
    initialSceneId?: string;
}

// Port của usePanoramaNavigation.ts (bản React Native) — thu hẹp phạm vi vào
// ĐÚNG 1 tour (bản gốc tìm xuyên suốt mọi "Room"/địa điểm vì viewer screen có
// thể vào thẳng từ URL param mà chưa biết trước location cha). Ở đây
// PanoramaViewerModal luôn được mở cho đúng 1 khách sạn/1 tour nên không cần
// độ tổng quát đó.
export function usePanoramaNavigation({ tour, initialSceneId }: UsePanoramaNavigationParams) {
    const sceneMap = useMemo(() => {
        const map = new Map<string, PanoramaScene>();
        tour.scenes.forEach((scene) => map.set(scene.id, scene));
        return map;
    }, [tour]);

    const startSceneId = useMemo(() => {
        if (initialSceneId && sceneMap.has(initialSceneId)) return initialSceneId;
        return tour.scenes[0]?.id ?? "";
    }, [initialSceneId, sceneMap, tour]);

    // Stack lịch sử scene trong phạm vi 1 lượt xem: mỗi lần bấm hotspot
    // NAVIGATION sẽ push thêm scene đích vào cuối stack thay vì thay thế, để
    // nút "Quay lại" có thể pop lại đúng scene vừa đi qua (giống history back
    // của trình duyệt, không gộp trùng các scene đã ghé qua).
    const [stack, setStack] = useState<string[]>([startSceneId]);
    const [selectedInfo, setSelectedInfo] = useState<PanoramaHotspot | null>(null);

    // Reset stack khi startSceneId đổi (mở lại viewer ở khách sạn/scene khác)
    // — chỉnh state ngay trong lúc render (theo khuyến nghị của React, giống
    // HotelDetail/HotelsView) thay vì dùng effect, tránh một nhịp render thừa
    // và cảnh báo set-state-in-effect.
    const [lastStartSceneId, setLastStartSceneId] = useState(startSceneId);
    if (startSceneId !== lastStartSceneId) {
        setLastStartSceneId(startSceneId);
        setStack([startSceneId]);
        setSelectedInfo(null);
    }

    const currentSceneId = stack[stack.length - 1];
    const currentScene = sceneMap.get(currentSceneId) ?? tour.scenes[0];
    const canGoBack = stack.length > 1;

    const handleHotspotPress = (hs: PanoramaHotspot) => {
        if (hs.type === "NAVIGATION" && hs.targetSceneId) {
            if (sceneMap.has(hs.targetSceneId)) {
                setStack((prev) => [...prev, hs.targetSceneId as string]);
            }
        } else if (hs.type === "INFO") {
            setSelectedInfo(hs);
        }
    };

    const goBack = () => {
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    };

    const getSceneById = (id: string): PanoramaScene | undefined => sceneMap.get(id);

    return {
        currentScene,
        selectedInfo,
        setSelectedInfo,
        handleHotspotPress,
        getSceneById,
        canGoBack,
        goBack,
    };
}
