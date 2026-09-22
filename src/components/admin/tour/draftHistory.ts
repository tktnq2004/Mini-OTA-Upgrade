import { useCallback, useRef, useState } from "react";
import type { HotspotDraft } from "./draft";

const MAX_HISTORY = 100;
// Các thao tác liên tiếp cùng "khoá" trong khoảng này (gõ tên, kéo hotspot...) gộp
// thành MỘT bước hoàn tác thay vì mỗi phím/khung hình một bước.
const COALESCE_MS = 700;

// Bản nháp hotspot của panorama đang mở + lịch sử hoàn tác/làm lại (Ctrl+Z / Ctrl+Shift+Z).
// `ref` luôn giữ bản mới nhất để các handler gọi liên tiếp trong cùng một tick (kéo hotspot,
// phím tắt) không đọc phải state cũ; state chỉ để render.
export function useDraftState(initial: HotspotDraft[] = []) {
  const [draft, setDraft] = useState(initial);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });
  const current = useRef(initial);
  const past = useRef<HotspotDraft[][]>([]);
  const future = useRef<HotspotDraft[][]>([]);
  const last = useRef({ key: "", at: 0 });

  const commit = useCallback((next: HotspotDraft[]) => {
    current.current = next;
    setDraft(next);
    setCounts({ undo: past.current.length, redo: future.current.length });
  }, []);

  /** Sửa bản nháp và ghi 1 bước lịch sử (trừ khi gộp được với thao tác ngay trước). */
  const apply = useCallback(
    (updater: (prev: HotspotDraft[]) => HotspotDraft[], coalesceKey?: string) => {
      const prev = current.current;
      const next = updater(prev);
      if (next === prev) return;
      const now = Date.now();
      const merge = Boolean(coalesceKey) && last.current.key === coalesceKey && now - last.current.at < COALESCE_MS;
      if (!merge) {
        past.current.push(prev);
        if (past.current.length > MAX_HISTORY) past.current.shift();
      }
      future.current = [];
      last.current = { key: coalesceKey ?? "", at: now };
      commit(next);
    },
    [commit]
  );

  /** Nạp bản nháp mới (đổi panorama, lưu xong) và xoá lịch sử. */
  const reset = useCallback(
    (next: HotspotDraft[]) => {
      past.current = [];
      future.current = [];
      last.current = { key: "", at: 0 };
      commit(next);
    },
    [commit]
  );

  /** Trả về bản nháp sau khi hoàn tác, hoặc null nếu không còn gì để hoàn tác. */
  const undo = useCallback((): HotspotDraft[] | null => {
    const prev = past.current.pop();
    if (!prev) return null;
    future.current.push(current.current);
    last.current = { key: "", at: 0 };
    commit(prev);
    return prev;
  }, [commit]);

  const redo = useCallback((): HotspotDraft[] | null => {
    const next = future.current.pop();
    if (!next) return null;
    past.current.push(current.current);
    last.current = { key: "", at: 0 };
    commit(next);
    return next;
  }, [commit]);

  return { draft, apply, reset, undo, redo, canUndo: counts.undo > 0, canRedo: counts.redo > 0 };
}
