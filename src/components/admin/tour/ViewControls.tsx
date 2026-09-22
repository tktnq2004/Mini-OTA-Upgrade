"use client";

import { useState } from "react";
import {
  CompassIcon,
  CornersInIcon,
  CornersOutIcon,
  KeyboardIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import styles from "./TourEditor.module.css";

interface ViewControlsProps {
  focusMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleFocus: () => void;
}

const SHORTCUTS: [string, string][] = [
  ["N", "Đặt hotspot chuyển cảnh"],
  ["I", "Đặt hotspot thông tin"],
  ["Esc", "Huỷ / quay về xoay ảnh"],
  ["Ctrl S", "Lưu hotspot"],
  ["Ctrl Z", "Hoàn tác"],
  ["Ctrl ⇧ Z", "Làm lại"],
  ["Ctrl D", "Nhân bản hotspot đang chọn"],
  ["Del", "Xoá hotspot đang chọn"],
  ["+ / −", "Phóng to / thu nhỏ"],
  ["0", "Đặt lại góc nhìn"],
  ["F", "Chế độ tập trung (ẩn 2 bảng)"],
];

// Cụm nút nổi ở góc dưới-phải ảnh: zoom, đặt lại góc nhìn, chế độ tập trung và bảng phím tắt.
export default function ViewControls({ focusMode, onZoomIn, onZoomOut, onReset, onToggleFocus }: ViewControlsProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className={styles.viewControls}>
      {helpOpen && (
        <div className={styles.shortcuts} role="dialog" aria-label="Phím tắt">
          <p className={styles.shortcutsTitle}>Phím tắt</p>
          <dl className={styles.shortcutList}>
            {SHORTCUTS.map(([keys, label]) => (
              <div key={keys} className={styles.shortcutRow}>
                <dt>{label}</dt>
                <dd>
                  <kbd className={styles.kbdKey}>{keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className={styles.controlGroup}>
        <button type="button" className={styles.controlButton} onClick={onZoomIn} title="Phóng to (+)" aria-label="Phóng to">
          <PlusIcon size={16} weight="bold" />
        </button>
        <button type="button" className={styles.controlButton} onClick={onZoomOut} title="Thu nhỏ (−)" aria-label="Thu nhỏ">
          <MinusIcon size={16} weight="bold" />
        </button>
        <button type="button" className={styles.controlButton} onClick={onReset} title="Đặt lại góc nhìn (0)" aria-label="Đặt lại góc nhìn">
          <CompassIcon size={16} />
        </button>
      </div>
      <div className={styles.controlGroup}>
        <button
          type="button"
          className={focusMode ? styles.controlButtonActive : styles.controlButton}
          onClick={onToggleFocus}
          title="Chế độ tập trung — ẩn 2 bảng (F)"
          aria-label="Chế độ tập trung"
          aria-pressed={focusMode}
        >
          {focusMode ? <CornersInIcon size={16} /> : <CornersOutIcon size={16} />}
        </button>
        <button
          type="button"
          className={helpOpen ? styles.controlButtonActive : styles.controlButton}
          onClick={() => setHelpOpen((v) => !v)}
          title="Phím tắt"
          aria-label="Phím tắt"
          aria-pressed={helpOpen}
        >
          <KeyboardIcon size={16} />
        </button>
      </div>
    </div>
  );
}
