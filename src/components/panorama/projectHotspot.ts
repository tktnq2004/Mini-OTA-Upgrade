import * as THREE from "three";
import type { HotspotItem, ProjectedHotspot } from "./types";

// Bán kính đặt hotspot, nhỏ hơn SPHERE_RADIUS (xem usePanoramaScene.ts) một
// chút để luôn nổi phía trước mặt cầu panorama thay vì chìm vào bên trong texture.
const HOTSPOT_RADIUS = 490;

// Chiếu toạ độ 3D của mỗi hotspot (nằm trên mặt cầu panorama) xuống toạ độ 2D
// màn hình theo góc nhìn hiện tại của camera, đồng thời xác định hotspot có
// đang nằm phía sau lưng camera hay không để ẩn/hiện nút bấm phù hợp.
// Port thuần logic Three.js từ bản React Native — không có phần nào phụ
// thuộc nền tảng nên giữ nguyên gần như 100%.
export function projectHotspots(
    camera: THREE.PerspectiveCamera,
    hotspots: HotspotItem[],
    screenWidth: number,
    screenHeight: number
): ProjectedHotspot[] {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    return hotspots.map((hs) => {
        const pos3D = new THREE.Vector3(...hs.position).normalize().multiplyScalar(HOTSPOT_RADIUS);
        const isBehind = pos3D.clone().normalize().dot(camDir) < 0.2;

        pos3D.project(camera);

        const screenX = ((pos3D.x + 1) * screenWidth) / 2;
        const screenY = ((-pos3D.y + 1) * screenHeight) / 2;

        return {
            ...hs,
            screenX,
            screenY,
            visible: !isBehind && pos3D.z < 1,
        };
    });
}
