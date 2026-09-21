"use client";

import { CaretRightIcon, FloppyDiskIcon, SidebarSimpleIcon, XIcon } from "@phosphor-icons/react";
import styles from "./TourEditor.module.css";

interface EditorTopBarProps {
  hotelName: string;
  scopeLabel: string | null;
  sceneName: string | null;
  dirty: boolean;
  busy: boolean;
  railOpen: boolean;
  inspectorOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onToggleRail: () => void;
  onToggleInspector: () => void;
}

export default function EditorTopBar({
  hotelName,
  scopeLabel,
  sceneName,
  dirty,
  busy,
  railOpen,
  inspectorOpen,
  onClose,
  onSave,
  onToggleRail,
  onToggleInspector,
}: EditorTopBarProps) {
  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.iconButton} onClick={onClose} title="Đóng trình chỉnh sửa" aria-label="Đóng">
        <XIcon size={17} weight="bold" />
      </button>
      <button
        type="button"
        className={railOpen ? styles.iconButtonActive : styles.iconButton}
        onClick={onToggleRail}
        title="Hiện/ẩn danh sách panorama"
        aria-label="Hiện hoặc ẩn danh sách panorama"
        aria-pressed={railOpen}
      >
        <SidebarSimpleIcon size={17} />
      </button>

      <div className={styles.titleBlock}>
        <span className={styles.eyebrow}>Tour 360°</span>
        <span className={styles.hotelName}>{hotelName || "Khách sạn"}</span>
      </div>

      {sceneName && (
        <>
          <span className={styles.divider} />
          <div className={styles.breadcrumb}>
            <span>{scopeLabel}</span>
            <CaretRightIcon size={12} weight="bold" />
            <span className={styles.breadcrumbCurrent}>{sceneName}</span>
          </div>
        </>
      )}

      <span className={styles.spacer} />

      <span className={styles.saveState}>
        <span className={dirty ? styles.dotDirty : styles.dot} />
        {dirty ? "Chưa lưu" : "Đã lưu"}
      </span>
      <button type="button" className={styles.primaryButton} disabled={busy || !dirty} onClick={onSave}>
        <FloppyDiskIcon size={15} weight="bold" />
        {busy ? "Đang lưu..." : "Lưu hotspot"}
        <span className={styles.kbd}>Ctrl S</span>
      </button>
      <button
        type="button"
        className={inspectorOpen ? styles.iconButtonActive : styles.iconButton}
        onClick={onToggleInspector}
        title="Hiện/ẩn bảng thuộc tính"
        aria-label="Hiện hoặc ẩn bảng thuộc tính"
        aria-pressed={inspectorOpen}
      >
        <SidebarSimpleIcon size={17} style={{ transform: "scaleX(-1)" }} />
      </button>
    </header>
  );
}
