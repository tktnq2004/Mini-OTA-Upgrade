// Kênh nhỏ đưa toạ độ dưới con trỏ từ PanoramaCanvas tới HUD (ViewHud) mà KHÔNG đi qua
// state của TourEditor — con trỏ di chuyển ~60 lần/giây, để TourEditor render lại mỗi lần
// thì rất phí. Mỗi trang chỉ có một editor nên dùng biến module là đủ.
export interface CursorPoint {
  yaw: number;
  pitch: number;
}

type Listener = (point: CursorPoint | null) => void;

const listeners = new Set<Listener>();

export function emitCursor(point: CursorPoint | null) {
  listeners.forEach((listener) => listener(point));
}

export function subscribeCursor(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
