import type { Language } from "@/components/i18n/LanguageProvider";
import type { PanoramaTour } from "@/components/panorama/types";
import { yawPitchToVector } from "./geometry";
import type { Tour } from "./types";

// Tiếng Anh còn trống thì lùi về tiếng Việt (giống quy ước ở TourResponse của backend).
const localized = <T extends string | null>(language: Language, vi: T, en: string | null) =>
  language === "en" && en?.trim() ? en : vi;

// Tour từ API (song ngữ, toạ độ yaw/pitch) -> dữ liệu của PanoramaViewerModal
// (1 ngôn ngữ, toạ độ 3D trên mặt cầu).
export function toPanoramaTour(tour: Tour, language: Language): PanoramaTour {
  return {
    id: `tour_${tour.hotelId}`,
    hotelId: tour.hotelId,
    scenes: tour.scenes.map((scene) => ({
      id: scene.id,
      name: localized(language, scene.nameVi, scene.nameEn),
      imageUrl: scene.imageUrl,
      hotspots: scene.hotspots.map((hs) => ({
        id: hs.id,
        type: hs.type,
        name: localized(language, hs.nameVi, hs.nameEn),
        description: localized(language, hs.descriptionVi, hs.descriptionEn) ?? undefined,
        targetSceneId: hs.targetSceneId ?? undefined,
        position: yawPitchToVector(hs.yaw, hs.pitch),
      })),
    })),
  };
}
