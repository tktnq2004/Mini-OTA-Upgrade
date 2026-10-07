import { adminGet, adminPost, adminPut } from "@/lib/admin/apiClient";
import type { HotspotInput, Tour, TourHotspot, TourScene, UpdateSceneInput } from "./types";

export const getTour = (hotelId: number, roomId?: number) =>
  adminGet<Tour>(`tours/hotels/${hotelId}${roomId ? `?roomId=${roomId}` : ""}`);

export const updateScene = (sceneId: string, input: UpdateSceneInput) =>
  adminPut<TourScene>(`tours/scenes/${sceneId}`, input);

export const saveHotspots = (sceneId: string, hotspots: HotspotInput[]) =>
  adminPut<TourHotspot[]>(`tours/scenes/${sceneId}/hotspots`, { hotspots });

export const syncTour = (hotelId: number) => adminPost<Tour>(`tours/hotels/${hotelId}/sync`, {});
