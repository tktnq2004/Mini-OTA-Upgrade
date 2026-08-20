// Kiến trúc dữ liệu port từ dự án React Native trước đó của người dùng
// (github.com/tktnq2004/PanoraStay) — giữ nguyên toạ độ hotspot (đã hiệu
// chỉnh thủ công khớp từng ảnh), chỉ đổi imageUrl từ require() sang URL string
// thường vì web không cần cơ chế resolve asset của Expo.
//
// Đặt tên "PanoramaTour" thay vì "Room" (như bản gốc) để không đụng tên với
// Room (phòng khách sạn để đặt) đã có sẵn ở src/data/rooms.data.ts — hai khái
// niệm hoàn toàn khác nhau dù trùng chữ ở bản gốc.

export interface PanoramaHotspot {
    id: string;
    type: "INFO" | "NAVIGATION";
    name: string;
    description?: string;
    targetSceneId?: string;
    /** Toạ độ 3D trên mặt cầu panorama — đã hiệu chỉnh thủ công khớp ảnh, không tự sinh. */
    position: [number, number, number];
}

export interface PanoramaScene {
    id: string;
    name: string;
    imageUrl: string;
    hotspots: PanoramaHotspot[];
}

export interface PanoramaTour {
    id: string;
    /** id khách sạn trong data khách sạn của MiniOTA — dùng để gắn nút "Xem 360°" đúng chỗ. */
    hotelId: number;
    scenes: PanoramaScene[];
}

export interface HotspotItem {
    id: string;
    name: string;
    position: [number, number, number];
    type: "INFO" | "NAVIGATION";
    onPress: () => void;
    /** Chỉ có ở hotspot NAVIGATION: ảnh + tên scene đích, hiện thẻ xem trước khi giữ chuột/tay lên hotspot. */
    previewImageUrl?: string;
    previewLabel?: string;
}

export interface ProjectedHotspot extends HotspotItem {
    screenX: number;
    screenY: number;
    visible: boolean;
}
