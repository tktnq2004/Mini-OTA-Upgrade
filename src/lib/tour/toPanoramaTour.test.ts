import { describe, expect, it } from "vitest";
import { toPanoramaTour } from "./toPanoramaTour";
import type { Tour, TourHotspot } from "./types";

const hotspot = (over: Partial<TourHotspot>): TourHotspot => ({
  id: "h1",
  type: "INFO",
  yaw: 0,
  pitch: 0,
  nameVi: "Quầy lễ tân",
  nameEn: null,
  descriptionVi: "Mở 24/7",
  descriptionEn: null,
  targetSceneId: null,
  ...over,
});

const tour = (hotspots: TourHotspot[]): Tour => ({
  hotelId: 907,
  startSceneId: "s1",
  scenes: [
    {
      id: "s1",
      mediaId: "m1",
      imageUrl: "https://r2/a.jpg",
      roomId: null,
      nameVi: "Sảnh",
      nameEn: "Lobby",
      entry: true,
      sortOrder: 0,
      hotspots,
    },
  ],
});

describe("toPanoramaTour", () => {
  it("chọn tên theo ngôn ngữ", () => {
    expect(toPanoramaTour(tour([]), "vi").scenes[0].name).toBe("Sảnh");
    expect(toPanoramaTour(tour([]), "en").scenes[0].name).toBe("Lobby");
  });

  it("tiếng Anh trống hoặc chỉ có khoảng trắng thì lùi về tiếng Việt", () => {
    const en = toPanoramaTour(tour([hotspot({ nameEn: "  " })]), "en").scenes[0].hotspots[0];
    expect(en.name).toBe("Quầy lễ tân");
    expect(en.description).toBe("Mở 24/7");
  });

  it("hotspot chuyển cảnh: không có mô tả, giữ panorama đích", () => {
    const hs = toPanoramaTour(
      tour([hotspot({ type: "NAVIGATION", descriptionVi: null, targetSceneId: "s2" })]),
      "vi"
    ).scenes[0].hotspots[0];
    expect(hs.description).toBeUndefined();
    expect(hs.targetSceneId).toBe("s2");
  });

  it("đổi yaw/pitch sang toạ độ 3D cùng quy ước với viewer (yaw 90° = +Z, pitch 90° = +Y)", () => {
    const at = (yaw: number, pitch: number) =>
      toPanoramaTour(tour([hotspot({ yaw, pitch })]), "vi").scenes[0].hotspots[0].position.map((n) =>
        Number(n.toFixed(6))
      );
    expect(at(0, 0)).toEqual([1, 0, 0]);
    expect(at(90, 0)).toEqual([0, 0, 1]);
    expect(at(0, 90)).toEqual([0, 1, 0]);
  });
});
