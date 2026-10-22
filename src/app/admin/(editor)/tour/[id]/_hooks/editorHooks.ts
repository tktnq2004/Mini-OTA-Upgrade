"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { HotspotType } from "@/lib/tour/types";

export interface EditorShortcutHandlers {
  save: () => void;
  undo: () => void;
  redo: () => void;
  remove: (key: string) => void;
  duplicate: (key: string) => void;
  selectedKey: string | null;
  startPlacing: (type: HotspotType) => void;
  cancelPlacing: () => void;
  toggleFocus: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

// Phím tắt editor: N / I chọn công cụ, Esc huỷ, Delete xoá hotspot đang chọn, Ctrl+S lưu,
// Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y) hoàn tác/làm lại, Ctrl+D nhân bản, F chế độ tập trung,
// +/−/0 điều khiển góc nhìn. Bỏ qua khi đang gõ vào ô nhập (để Ctrl+Z gõ chữ vẫn là của
// trình duyệt), trừ Ctrl+S. Đọc handler mới nhất qua ref để chỉ đăng ký listener một lần.
export function useEditorShortcuts(handlers: EditorShortcutHandlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctx = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "s") {
        e.preventDefault();
        ctx.save();
        return;
      }
      const el = e.target as HTMLElement | null;
      const typing = el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
      if (typing) return;

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) ctx.redo();
        else ctx.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        ctx.redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (ctx.selectedKey) ctx.duplicate(ctx.selectedKey);
        return;
      }
      if (mod || e.altKey) return;

      if (e.key === "Escape") ctx.cancelPlacing();
      else if (key === "n") ctx.startPlacing("NAVIGATION");
      else if (key === "i") ctx.startPlacing("INFO");
      else if (key === "f") ctx.toggleFocus();
      else if (e.key === "+" || e.key === "=") ctx.zoomIn();
      else if (e.key === "-" || e.key === "_") ctx.zoomOut();
      else if (e.key === "0") ctx.resetView();
      else if ((e.key === "Delete" || e.key === "Backspace") && ctx.selectedKey) {
        e.preventDefault();
        ctx.remove(ctx.selectedKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// Gọi `refresh` khi tab lấy lại focus (người dùng vừa upload/xoá panorama ở tab quản
// lý). `focus` và `visibilitychange` thường nổ cùng lúc — refresh tự chặn chạy chồng.
// Đọc hàm mới nhất qua ref để chỉ đăng ký listener một lần.
export function useRefreshOnFocus(refresh: () => Promise<void> | void) {
  const ref = useRef(refresh);
  useEffect(() => {
    ref.current = refresh;
  });
  useEffect(() => {
    const onFocus = () => void ref.current();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
  return ref;
}

// Cảnh báo khi đóng/tải lại tab lúc còn thay đổi chưa lưu. skipRef = true để bỏ qua
// (vd. chính nút "Đóng" đã hỏi xác nhận rồi).
export function useWarnBeforeUnload(dirty: boolean, skipRef: RefObject<boolean>) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (skipRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, skipRef]);
}
