import type { TourScene } from "@/lib/tour/types";

export interface RoomCoverage {
  roomId: number;
  sceneCount: number;
  /**
   * Có ít nhất 1 hotspot chuyển cảnh từ MỘT SCENE KHÁC PHẠM VI (hành lang hoặc
   * phòng khác) dẫn vào phòng này. Phòng có scene mà chưa có đường vào thì
   * khách đi từ thumbnail hotel không bao giờ tới được — chỉ xem được trực
   * tiếp từ trang chi tiết phòng.
   */
  reachable: boolean;
}

export interface TourCoverage {
  byRoom: Map<number, RoomCoverage>;
  /** Số phòng đã có ít nhất 1 scene / tổng số phòng của hotel. */
  roomsWithScenes: number;
  totalRooms: number;
}

// Hàm thuần: tính độ phủ tour theo từng phòng từ danh sách scene hiện có.
export function computeCoverage(scenes: TourScene[], roomIds: number[]): TourCoverage {
  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  const byRoom = new Map<number, RoomCoverage>();

  for (const roomId of roomIds) {
    const own = scenes.filter((s) => s.roomId === roomId);
    if (own.length === 0) continue;

    const reachable = scenes.some(
      (source) =>
        source.roomId !== roomId &&
        source.hotspots.some((h) => {
          if (h.type !== "NAVIGATION" || !h.targetSceneId) return false;
          return sceneById.get(h.targetSceneId)?.roomId === roomId;
        })
    );
    byRoom.set(roomId, { roomId, sceneCount: own.length, reachable });
  }

  return { byRoom, roomsWithScenes: byRoom.size, totalRooms: roomIds.length };
}
