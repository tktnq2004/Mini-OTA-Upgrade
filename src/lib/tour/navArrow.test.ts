import { describe, expect, it } from "vitest";
import { carryYaw, yawPitchToVector } from "./geometry";
import { layoutNavArrows, placeNavArrow } from "./navArrow";

const W = 1400;
const H = 860;
const slotAt = (yaw: number) => layoutNavArrows([{ id: "a", position: yawPitchToVector(yaw, -15) }]).get("a")!;
const at = (targetYaw: number, cameraYaw: number, width = W, height = H) =>
  placeNavArrow(slotAt(targetYaw), cameraYaw, width, height);

describe("placeNavArrow", () => {
  it("đích trước mặt: vòng tròn ở giữa, mũi tên chỉ thẳng lên", () => {
    const a = at(40, 40);
    expect(a.x).toBeCloseTo(W / 2, 5);
    expect(a.angle).toBeCloseTo(-90, 5);
    expect(a.rear).toBe(false);
  });

  it("mũi tên quay đúng bằng góc xoay camera", () => {
    expect(at(0, -50).angle).toBeCloseTo(-40, 5); // đích lệch phải 50°
    expect(at(0, 50).angle).toBeCloseTo(-140, 5); // đích lệch trái 50°
    expect(at(0, -90).angle).toBeCloseTo(0, 5); // đích ngay bên phải: chỉ sang phải
    expect(at(0, 90).angle).toBeCloseTo(-180, 5); // đích ngay bên trái: chỉ sang trái
  });

  it("vòng tròn chạy quanh vành theo đúng phía của đích", () => {
    const ahead = at(0, 0);
    const right = at(0, -60);
    const left = at(0, 60);
    expect(right.x).toBeGreaterThan(ahead.x);
    expect(left.x).toBeLessThan(ahead.x);
    expect(right.y).toBeGreaterThan(ahead.y); // ra 2 bên thì thấp dần xuống gần chân người xem
  });

  it("đích sau lưng vẫn hiện: mũi tên chỉ xuống, liền mạch khi qua điểm ±180°", () => {
    const behind = at(180, 0);
    expect(behind.rear).toBe(true);
    expect(Math.abs(behind.angle - 90)).toBeLessThan(1e-6);
    expect(behind.x).toBeCloseTo(W / 2, 5);
    const a = at(179, 0);
    const b = at(-179, 0);
    expect(Math.abs(a.x - b.x)).toBeLessThan(30);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
  });

  it("luôn nằm trong màn hình, kể cả điện thoại", () => {
    for (const [width, height] of [[W, H], [390, 844], [360, 640]]) {
      for (let cam = -180; cam < 180; cam += 15) {
        const { x, y } = at(0, cam, width, height);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(width);
        expect(y).toBeGreaterThan(height / 2);
        expect(y).toBeLessThan(height);
      }
    }
  });
});

describe("layoutNavArrows", () => {
  it("2 đích gần cùng hướng: tách vị trí, mũi tên vẫn chỉ đúng đích của nó", () => {
    const arrows = layoutNavArrows([
      { id: "a", position: yawPitchToVector(14, -30) },
      { id: "b", position: yawPitchToVector(16, -30) },
    ]);
    const a = arrows.get("a")!;
    const b = arrows.get("b")!;
    expect(b.yaw - a.yaw).toBeGreaterThanOrEqual(19.9);
    expect(a.targetYaw).toBeCloseTo(14, 5);
    expect(b.targetYaw).toBeCloseTo(16, 5);
    expect(placeNavArrow(a, 14, W, H).angle).toBeCloseTo(-90, 5);
  });

  it("nhận cả toạ độ không chuẩn hoá của tour mẫu", () => {
    const slot = layoutNavArrows([{ id: "a", position: [10, 0.3, 10] }]).get("a")!;
    expect(slot.targetYaw).toBeCloseTo(45, 5);
  });
});

describe("carryYaw", () => {
  it("giữ nguyên hướng thật khi 2 ảnh có gốc yaw khác nhau", () => {
    // Hành lang: yaw 0 nhìn Bắc. Đang nhìn Tây Bắc (-45). Phòng: yaw 0 nhìn Tây (-90) -> Tây Bắc là +45.
    expect(carryYaw(-45, 0, -90)).toBe(45);
    expect(carryYaw(170, 90, -90)).toBe(-10);
  });

  it("thiếu hướng của 1 trong 2 ảnh thì giữ nguyên con số yaw", () => {
    expect(carryYaw(33, undefined, 90)).toBe(33);
    expect(carryYaw(33, 90, undefined)).toBe(33);
  });
});
