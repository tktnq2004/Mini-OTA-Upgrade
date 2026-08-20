"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useReducedMotion } from "./useReducedMotion";
import { usePanoramaNavigation } from "./usePanoramaNavigation";
import PanoramaCanvas from "./PanoramaCanvas";
import PanoramaViewerHeader from "./PanoramaViewerHeader";
import HotspotInfoModal from "./HotspotInfoModal";
import type { HotspotItem, PanoramaTour } from "./types";
import styles from "./PanoramaViewerModal.module.css";

const TRANSITION_FADE_IN_MS = 220;
const TRANSITION_FADE_OUT_MS = 350;
// Lưới an toàn: nếu vì lý do gì đó scene mới không bao giờ báo "sẵn sàng"
// (ảnh lỗi, mạng chậm...), vẫn phải mở lại màn hình sau tối đa khoảng này,
// không được kẹt màn đen vĩnh viễn.
const TRANSITION_MAX_WAIT_MS = 1500;

interface PanoramaViewerModalProps {
    tour: PanoramaTour;
    hotelName: string;
    initialSceneId?: string;
    onClose: () => void;
}

// Port của app/viewer.tsx (bản React Native) — điều phối stack điều hướng
// hotspot + hiệu ứng chuyển cảnh "fade qua màu đen" đồng bộ theo tín hiệu
// sẵn sàng thực tế (isReady từ PanoramaCanvas) thay vì đoán một khoảng thời
// gian cố định. Render qua createPortal vào document.body để đảm bảo overlay
// toàn màn hình không bao giờ bị kẹt bởi z-index/overflow của layout trang
// chi tiết phòng bên dưới.
export default function PanoramaViewerModal({
    tour,
    hotelName,
    initialSceneId,
    onClose,
}: PanoramaViewerModalProps) {
    const { t } = useLanguage();
    const reducedMotion = useReducedMotion();

    const {
        currentScene,
        selectedInfo,
        setSelectedInfo,
        handleHotspotPress,
        getSceneById,
        canGoBack,
        goBack,
    } = usePanoramaNavigation({ tour, initialSceneId });

    const [fadeOpacity, setFadeOpacity] = useState(0);
    const [fadeDurationMs, setFadeDurationMs] = useState(TRANSITION_FADE_OUT_MS);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevSceneIdRef = useRef<string | null>(null);
    const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const isFirstMount = prevSceneIdRef.current === null;
        prevSceneIdRef.current = currentScene.id;
        if (isFirstMount || reducedMotion) return;

        setIsTransitioning(true);
        setFadeDurationMs(TRANSITION_FADE_IN_MS);
        setFadeOpacity(1);

        if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = setTimeout(() => {
            setFadeDurationMs(TRANSITION_FADE_OUT_MS);
            setFadeOpacity(0);
            setIsTransitioning(false);
        }, TRANSITION_MAX_WAIT_MS);

        return () => {
            if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
        };
    }, [currentScene.id, reducedMotion]);

    const handleSceneReady = () => {
        if (!isTransitioning) return;
        if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
        }
        setFadeDurationMs(TRANSITION_FADE_OUT_MS);
        setFadeOpacity(0);
        setIsTransitioning(false);
    };

    const hotspots: HotspotItem[] = currentScene.hotspots.map((hs) => {
        // Hotspot NAVIGATION cần ảnh + tên scene đích để hiện thẻ xem trước khi
        // giữ chuột/tay lên marker.
        const target = hs.type === "NAVIGATION" && hs.targetSceneId ? getSceneById(hs.targetSceneId) : undefined;
        return {
            id: hs.id,
            name: hs.name,
            type: hs.type,
            position: hs.position,
            onPress: () => handleHotspotPress(hs),
            previewImageUrl: target?.imageUrl,
            previewLabel: target?.name,
        };
    });

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t("panorama.viewerTitle")}>
            <PanoramaViewerHeader
                hotelName={hotelName}
                sceneName={currentScene.name}
                onClose={onClose}
                onReturn={goBack}
                canReturn={canGoBack}
            />

            <PanoramaCanvas
                key={currentScene.id}
                imageUrl={currentScene.imageUrl}
                hotspots={hotspots}
                onReady={handleSceneReady}
            />

            <HotspotInfoModal info={selectedInfo} onClose={() => setSelectedInfo(null)} />

            <div
                className={styles.transitionFade}
                style={{
                    opacity: fadeOpacity,
                    transitionDuration: `${fadeDurationMs}ms`,
                    pointerEvents: isTransitioning ? "auto" : "none",
                }}
            />
        </div>,
        document.body
    );
}
