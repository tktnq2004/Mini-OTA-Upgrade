"use client";

import { CheckCircleIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import styles from "./TourEditor.module.css";

// Thông báo nổi ở góc sân khấu: lỗi (có nút đóng) ưu tiên hơn thông báo thành công.
export default function EditorToasts({
  error,
  notice,
  onDismissError,
}: {
  error: string;
  notice: string;
  onDismissError: () => void;
}) {
  return (
    <div className={styles.toasts}>
      {error && (
        <div className={styles.toastError} role="alert">
          <WarningCircleIcon className={styles.toastIcon} size={16} weight="fill" color="var(--color-error)" />
          <span>{error}</span>
          <button type="button" className={styles.toastClose} onClick={onDismissError} aria-label="Đóng thông báo">
            <XIcon size={13} weight="bold" />
          </button>
        </div>
      )}
      {!error && notice && (
        <div className={styles.toast} role="status">
          <CheckCircleIcon className={styles.toastIcon} size={16} weight="fill" color="var(--color-success)" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
