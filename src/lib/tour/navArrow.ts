import { normalizeYaw, type Vec3 } from "./geometry";

const RAD = Math.PI / 180;

// Vòng tròn chuyển cảnh chạy trên một vành quanh chân người xem, mũi tên trong vòng tròn
// như kim la bàn nhìn từ trên xuống: đuôi về camera, đầu về đích. Xoay camera thì vòng tròn
// chạy quanh vành và mũi tên quay đúng bằng góc đó. Không bám phối cảnh sàn: nhìn ngang thì
// mọi đường từ chân camera ra sàn đều hiện thành đường dọc, mũi tên sẽ luôn chỉ lên.
const MIN_SEPARATION = 20; // độ, giữa 2 vòng tròn cạnh nhau để không đè lên nhau
const SIDE_MARGIN = 90; // chừa bề ngang cho nhãn ở 2 mép màn hình
const MIN_RING_WIDTH = 60;
const RING_HEIGHT_RATIO = 0.12;
const MAX_RING_HEIGHT = 100;
const BOTTOM_MARGIN = 56;
const REAR_ANGLE = 100; // lệch hơn góc này là đích sau lưng: chỉ hiện vòng tròn, đỡ rối nhãn

export interface NavArrowTarget {
  id: string;
  position: Vec3;
}

export interface NavArrowSlot {
  /** Vị trí trên vành: có thể lệch khỏi targetYaw để 2 vòng tròn không đè nhau. */
  yaw: number;
  /** Hướng thật tới đích, mũi tên luôn theo góc này. */
  targetYaw: number;
}

export interface PlacedNavArrow {
  x: number;
  y: number;
  /** Hướng mũi tên trên màn hình (độ, 0 = sang phải, -90 = thẳng lên, 90 = chỉ xuống). */
  angle: number;
  rear: boolean;
}

// 2 đích gần cùng hướng (2 thang máy cạnh nhau) thì đẩy vị trí vòng tròn ra xa nhau.
function spread(slots: (NavArrowSlot & { id: string })[]) {
  if (slots.length < 2) return;
  for (let pass = 0; pass < 8; pass++) {
    slots.sort((a, b) => a.yaw - b.yaw);
    slots.forEach((a, i) => {
      const b = slots[(i + 1) % slots.length];
      const gap = normalizeYaw(b.yaw - a.yaw);
      if (gap >= 0 && gap < MIN_SEPARATION) {
        const push = (MIN_SEPARATION - gap) / 2;
        a.yaw = normalizeYaw(a.yaw - push);
        b.yaw = normalizeYaw(b.yaw + push);
      }
    });
  }
}

export function layoutNavArrows(targets: NavArrowTarget[]): Map<string, NavArrowSlot> {
  const slots = targets.map(({ id, position: [x, , z] }) => {
    const yaw = Math.atan2(z, x) / RAD;
    return { id, yaw, targetYaw: yaw };
  });
  spread(slots);
  return new Map(slots.map(({ id, yaw, targetYaw }) => [id, { yaw, targetYaw }]));
}

export function placeNavArrow(slot: NavArrowSlot, cameraYaw: number, width: number, height: number): PlacedNavArrow {
  const along = normalizeYaw(slot.yaw - cameraYaw) * RAD;
  const toTarget = normalizeYaw(slot.targetYaw - cameraYaw);
  const ringWidth = Math.max(MIN_RING_WIDTH, width / 2 - SIDE_MARGIN);
  const ringHeight = Math.min(MAX_RING_HEIGHT, height * RING_HEIGHT_RATIO);
  const centerY = height - BOTTOM_MARGIN - ringHeight;
  return {
    x: width / 2 + ringWidth * Math.sin(along),
    y: centerY - ringHeight * Math.cos(along),
    angle: toTarget - 90,
    rear: Math.abs(toTarget) > REAR_ANGLE,
  };
}
