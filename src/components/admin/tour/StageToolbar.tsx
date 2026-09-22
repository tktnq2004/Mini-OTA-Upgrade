"use client";

import { ArrowRightIcon, CursorIcon, InfoIcon } from "@phosphor-icons/react";
import type { HotspotType } from "@/lib/tour/types";
import styles from "./TourEditor.module.css";

export type ActiveTool = "select" | HotspotType;

interface StageToolbarProps {
  tool: ActiveTool;
  onChange: (tool: ActiveTool) => void;
}

const TOOLS: { id: ActiveTool; label: string; hint: string; key: string; Icon: typeof CursorIcon }[] = [
  { id: "select", label: "Xoay", hint: "Kéo để xoay ảnh, kéo marker để dời hotspot", key: "Esc", Icon: CursorIcon },
  { id: "NAVIGATION", label: "Chuyển cảnh", hint: "Bấm lên ảnh để đặt hotspot đi tới panorama khác", key: "N", Icon: ArrowRightIcon },
  { id: "INFO", label: "Thông tin", hint: "Bấm lên ảnh để đặt hotspot hiện thông tin", key: "I", Icon: InfoIcon },
];

// Thanh công cụ nổi ngay trên ảnh panorama: chọn công cụ rồi bấm lên ảnh để đặt điểm. Công cụ
// đặt điểm là "một lần" — đặt xong tự quay về "Xoay" để tránh lỡ tay bấm thêm hotspot khi
// đang định kéo ảnh.
export default function StageToolbar({ tool, onChange }: StageToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Công cụ hotspot">
      {TOOLS.map(({ id, label, hint, key, Icon }) => (
        <button
          key={id}
          type="button"
          className={tool === id ? styles.toolActive : styles.tool}
          onClick={() => onChange(id)}
          aria-pressed={tool === id}
          title={`${hint} (${key})`}
        >
          <Icon size={16} weight={tool === id ? "fill" : "bold"} />
          {label}
          <span className={styles.toolKey}>{key}</span>
        </button>
      ))}
    </div>
  );
}
