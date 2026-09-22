"use client";

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CaretRightIcon,
  FloppyDiskIcon,
  MoonIcon,
  SidebarSimpleIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import styles from "./TourEditor.module.css";

interface EditorTopBarProps {
  hotelName: string;
  scopeLabel: string | null;
  sceneName: string | null;
  dirty: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  railOpen: boolean;
  inspectorOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleRail: () => void;
  onToggleInspector: () => void;
}

export default function EditorTopBar({
  hotelName,
  scopeLabel,
  sceneName,
  dirty,
  busy,
  canUndo,
  canRedo,
  railOpen,
  inspectorOpen,
  onClose,
  onSave,
  onUndo,
  onRedo,
  onToggleRail,
  onToggleInspector,
}: EditorTopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.iconButton} onClick={onClose} title="Đóng trình chỉnh sửa" aria-label="Đóng">
        <XIcon size={17} weight="bold" />
      </button>
      <span className={styles.divider} />

      <div className={styles.titleBlock}>
        <span className={styles.hotelName}>{hotelName || "Khách sạn"}</span>
        <span className={styles.breadcrumb}>
          <span>Tour 360°</span>
          {sceneName && (
            <>
              <CaretRightIcon size={10} weight="bold" />
              <span>{scopeLabel}</span>
              <CaretRightIcon size={10} weight="bold" />
              <span className={styles.breadcrumbCurrent}>{sceneName}</span>
            </>
          )}
        </span>
      </div>

      <span className={styles.spacer} />

      <div className={styles.topGroup}>
        <button type="button" className={styles.iconButton} onClick={onUndo} disabled={!canUndo} title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác">
          <ArrowCounterClockwiseIcon size={17} />
        </button>
        <button type="button" className={styles.iconButton} onClick={onRedo} disabled={!canRedo} title="Làm lại (Ctrl+Shift+Z)" aria-label="Làm lại">
          <ArrowClockwiseIcon size={17} />
        </button>
      </div>
      <span className={styles.divider} />
      <div className={styles.topGroup}>
        <button
          type="button"
          className={railOpen ? styles.iconButtonActive : styles.iconButton}
          onClick={onToggleRail}
          title="Danh sách panorama"
          aria-label="Hiện hoặc ẩn danh sách panorama"
          aria-pressed={railOpen}
        >
          <SidebarSimpleIcon size={17} />
        </button>
        <button
          type="button"
          className={inspectorOpen ? styles.iconButtonActive : styles.iconButton}
          onClick={onToggleInspector}
          title="Bảng thuộc tính"
          aria-label="Hiện hoặc ẩn bảng thuộc tính"
          aria-pressed={inspectorOpen}
        >
          <SidebarSimpleIcon size={17} style={{ transform: "scaleX(-1)" }} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={toggleTheme}
          title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          aria-label="Đổi giao diện sáng/tối"
        >
          {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
      </div>
      <span className={styles.divider} />

      <span className={styles.saveState}>
        <span className={dirty ? styles.dotDirty : styles.dot} />
        {dirty ? "Chưa lưu" : "Đã lưu"}
      </span>
      <button type="button" className={styles.primaryButton} disabled={busy || !dirty} onClick={onSave}>
        <FloppyDiskIcon size={15} weight="bold" />
        {busy ? "Đang lưu..." : "Lưu hotspot"}
      </button>
    </header>
  );
}
