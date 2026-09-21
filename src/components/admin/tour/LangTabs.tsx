"use client";

import styles from "./TourEditor.module.css";

export type Lang = "vi" | "en";

interface LangTabsProps {
  value: Lang;
  onChange: (lang: Lang) => void;
  /** Ngôn ngữ nào đang thiếu nội dung -> hiện chấm vàng nhắc trên tab đó. */
  missing?: Partial<Record<Lang, boolean>>;
}

// Chuyển qua lại giữa nội dung tiếng Việt / tiếng Anh trong CÙNG một ô nhập —
// gọn hơn hiện 2 ô song song cho mỗi trường, mà vẫn thấy ngay ngôn ngữ nào
// còn thiếu (chấm vàng).
export default function LangTabs({ value, onChange, missing }: LangTabsProps) {
  return (
    <div className={styles.langTabs} role="tablist" aria-label="Ngôn ngữ nội dung">
      {(["vi", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="tab"
          aria-selected={value === lang}
          className={`${value === lang ? styles.langTabActive : styles.langTab} ${missing?.[lang] ? styles.langMissing : ""}`}
          onClick={() => onChange(lang)}
          title={missing?.[lang] ? `Chưa có nội dung ${lang === "vi" ? "tiếng Việt" : "tiếng Anh"}` : undefined}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
