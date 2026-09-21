// Toán học giữa yaw/pitch (độ) và không gian 3D của viewer three.js.
//
// Quy ước (khớp usePanoramaScene.ts): camera nhìn về hướng
//   (cos(lat)·cos(lon), sin(lat), cos(lat)·sin(lon))
// với lon = yaw, lat = pitch. yaw 0 = hướng +X, tăng dần về phía +Z; pitch
// −90 thẳng xuống, 0 ngang tầm mắt, +90 thẳng lên.
const RAD = Math.PI / 180;

export type Vec3 = [number, number, number];

export function yawPitchToVector(yaw: number, pitch: number): Vec3 {
  const y = yaw * RAD;
  const p = pitch * RAD;
  return [Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y)];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function normalizeYaw(yaw: number): number {
  const y = ((((yaw + 180) % 360) + 360) % 360) - 180;
  return y === -180 ? 180 : y;
}

export interface PickParams {
  /** Góc nhìn hiện tại của camera (độ) — chính là lonRef/latRef của usePanoramaControls. */
  lon: number;
  lat: number;
  /** FOV dọc (độ), cùng đơn vị PerspectiveCamera.fov. */
  fov: number;
  width: number;
  height: number;
  /** Vị trí điểm bấm, tính từ góc trên-trái của vùng canvas (px). */
  x: number;
  y: number;
}

// Từ điểm bấm trên canvas → yaw/pitch của điểm đó trên mặt cầu panorama, bằng
// mô hình camera pinhole (không cần truy cập object camera của three.js):
// tia = hướng nhìn + (x NDC · tan(fov/2) · aspect) · phải + (y NDC · tan(fov/2)) · lên.
export function pickToYawPitch({ lon, lat, fov, width, height, x, y }: PickParams): { yaw: number; pitch: number } {
  const forward = yawPitchToVector(lon, lat);
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);

  const ndcX = (x / width) * 2 - 1;
  const ndcY = 1 - (y / height) * 2;
  const tanHalf = Math.tan((fov * RAD) / 2);
  const aspect = width / height;

  const dir = normalize([
    forward[0] + right[0] * ndcX * tanHalf * aspect + up[0] * ndcY * tanHalf,
    forward[1] + right[1] * ndcX * tanHalf * aspect + up[1] * ndcY * tanHalf,
    forward[2] + right[2] * ndcX * tanHalf * aspect + up[2] * ndcY * tanHalf,
  ]);

  return {
    yaw: normalizeYaw(Math.atan2(dir[2], dir[0]) / RAD),
    pitch: Math.asin(Math.max(-1, Math.min(1, dir[1]))) / RAD,
  };
}
