"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePanoramaControls } from "./usePanoramaControls";
import { projectHotspots } from "./projectHotspot";
import type { HotspotItem, ProjectedHotspot } from "./types";

const SPHERE_RADIUS = 500;

interface UsePanoramaSceneParams {
    imageUrl: string;
    hotspots: HotspotItem[];
}

// Port của usePanoramaScene.ts (bản React Native, dùng expo-gl + expo-three)
// sang WebGLRenderer thường của three.js. Không còn cần cơ chế resolve asset
// (Asset.downloadAsync) hay đồng bộ kích thước GL surface thủ công
// (useGLViewportSync) — canvas DOM tự báo kích thước qua ResizeObserver, và
// TextureLoader nhận thẳng URL string thay vì asset đã resolve.
//
// Toàn bộ scene được dựng lại từ đầu mỗi khi imageUrl đổi (thay vì chỉ đổi
// texture) — giữ đúng chiến lược "remount sạch" của bản gốc, tránh các lỗi
// tinh vi khi hoán texture trên renderer đang chạy.
export function usePanoramaScene({ imageUrl, hotspots }: UsePanoramaSceneParams) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { lonRef, latRef, fovRef } = usePanoramaControls(containerRef);

    const [projectedHotspots, setProjectedHotspots] = useState<ProjectedHotspot[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Đọc hotspots mới nhất trong vòng lặp render mà không phải liệt kê nó
    // vào dependency của effect chính bên dưới — effect đó chỉ nên chạy lại
    // khi đổi ẢNH (remount scene), không phải mỗi khi mảng hotspots đổi
    // reference (vd. do component cha re-render vì lý do khác).
    const hotspotsRef = useRef(hotspots);
    useEffect(() => {
        hotspotsRef.current = hotspots;
    }, [hotspots]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let disposed = false;
        let animationFrameId: number | null = null;
        let hasSignaledReady = false;

        setLoadError(null);
        setIsReady(false);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(fovRef.current, 1, 0.1, 1000);
        camera.position.set(0, 0, 0);

        const applySize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        applySize();

        const resizeObserver = new ResizeObserver(applySize);
        resizeObserver.observe(container);

        const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 60, 40);
        geometry.scale(-1, 1, 1);
        let sphere: THREE.Mesh | null = null;

        new THREE.TextureLoader().load(
            imageUrl,
            (texture) => {
                if (disposed) {
                    texture.dispose();
                    return;
                }

                // GL không tự báo lỗi khi ảnh vượt giới hạn texture của GPU — texture
                // chỉ âm thầm "incomplete" (đen/méo) mà không ném exception nào. Chủ
                // động so sánh kích thước thật của ảnh với giới hạn GPU và tự báo lỗi
                // rõ ràng, thay vì để hiện tượng lạ không rõ nguyên nhân.
                const maxTextureSize = renderer.capabilities.maxTextureSize;
                const imgWidth = texture.image?.width ?? 0;
                const imgHeight = texture.image?.height ?? 0;
                if (imgWidth > maxTextureSize || imgHeight > maxTextureSize) {
                    setLoadError(
                        `Ảnh panorama ${imgWidth}x${imgHeight} vượt quá kích thước texture tối đa (${maxTextureSize}) mà GPU này hỗ trợ.`
                    );
                    return;
                }

                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = false;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;

                const material = new THREE.MeshBasicMaterial({ map: texture });
                sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
            },
            undefined,
            () => {
                if (!disposed) setLoadError("Không thể tải ảnh panorama này.");
            }
        );

        const targetVector = new THREE.Vector3();

        const render = () => {
            animationFrameId = requestAnimationFrame(render);

            if (camera.fov !== fovRef.current) {
                camera.fov = fovRef.current;
                camera.updateProjectionMatrix();
            }

            const phi = THREE.MathUtils.degToRad(90 - latRef.current);
            const theta = THREE.MathUtils.degToRad(lonRef.current);

            targetVector.x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
            targetVector.y = SPHERE_RADIUS * Math.cos(phi);
            targetVector.z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

            camera.lookAt(targetVector);
            camera.updateMatrixWorld();

            if (hotspotsRef.current.length > 0) {
                setProjectedHotspots(
                    projectHotspots(camera, hotspotsRef.current, container.clientWidth, container.clientHeight)
                );
            }

            renderer.render(scene, camera);

            // Báo hiệu "đã render xong khung hình đầu tiên" đúng 1 lần, để nơi gọi
            // (PanoramaViewerModal) biết khi nào an toàn để fade màn chuyển cảnh
            // trở lại, thay vì đoán một khoảng thời gian cố định.
            if (!hasSignaledReady) {
                hasSignaledReady = true;
                setIsReady(true);
            }
        };

        render();

        return () => {
            disposed = true;
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();

            geometry.dispose();
            if (sphere) {
                const material = sphere.material as THREE.MeshBasicMaterial;
                material.map?.dispose();
                material.dispose();
            }
            scene.clear();
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageUrl]);

    return { containerRef, projectedHotspots, loadError, isReady };
}
