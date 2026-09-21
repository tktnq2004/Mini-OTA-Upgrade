"use client";

import { useState } from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import controls from "@/styles/controls.module.css";
import type { TourScene, UpdateSceneInput } from "@/lib/tour/types";
import LangTabs, { type Lang } from "./LangTabs";
import styles from "./TourEditor.module.css";

interface SceneSettingsProps {
  hotelId: number;
  scene: TourScene;
  scopeLabel: string;
  busy: boolean;
  onSave: (input: UpdateSceneInput) => void;
}

// Tab "Panorama": chỉ đổi TÊN (vi/en) và đặt làm điểm bắt đầu. Panorama thuộc
// khách sạn hay phòng nào do NƠI UPLOAD quyết định nên ở đây chỉ hiển thị; upload
// và xoá panorama làm ở trang quản lý khách sạn / phòng. Đặt `key={scene.id}` ở
// nơi dùng để state nhập tên tự reset khi đổi panorama.
export default function SceneSettings({ hotelId, scene, scopeLabel, busy, onSave }: SceneSettingsProps) {
  const [lang, setLang] = useState<Lang>("vi");
  const [nameVi, setNameVi] = useState(scene.nameVi);
  const [nameEn, setNameEn] = useState(scene.nameEn ?? "");
  const changed = nameVi.trim() !== scene.nameVi || nameEn.trim() !== (scene.nameEn ?? "");
  const isHotelLevel = scene.roomId === null;

  return (
    <div className={styles.section}>
      <LangTabs value={lang} onChange={setLang} missing={{ en: !nameEn.trim() }} />
      <div className={controls.field}>
        <label className={controls.label}>{lang === "vi" ? "Tên panorama (VI) *" : "Tên panorama (EN)"}</label>
        {lang === "vi" ? (
          <input className={controls.input} value={nameVi} onChange={(e) => setNameVi(e.target.value)} />
        ) : (
          <input className={controls.input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        )}
      </div>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.smallButtonPrimary}
          disabled={busy || !changed || !nameVi.trim()}
          onClick={() => onSave({ nameVi: nameVi.trim(), nameEn: nameEn.trim() })}
        >
          Lưu tên
        </button>
      </div>

      <div className={`${styles.section} ${styles.divideTop}`}>
        <p className={styles.sectionTitle}>Thuộc về</p>
        <div className={styles.metaLine}>
          <strong style={{ color: "var(--color-text)" }}>{scopeLabel}</strong>
        </div>
        <p className={styles.hint}>
          Do nơi upload quyết định. Muốn đổi sang phòng khác: xoá ảnh và upload lại ở trang quản lý đúng phòng.
        </p>
        <div className={styles.actionRow}>
          <a className={styles.smallButton} href={`/admin/hotels/${hotelId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            Mở trang quản lý
            <ArrowSquareOutIcon size={13} weight="bold" />
          </a>
        </div>
      </div>

      <div className={`${styles.section} ${styles.divideTop}`}>
        <p className={styles.sectionTitle}>Điểm bắt đầu</p>
        {scene.entry ? (
          <div className={styles.metaLine}>
            <span className={styles.badge}>Panorama bắt đầu</span>
            <span>của «{scopeLabel}»</span>
          </div>
        ) : (
          <>
            <p className={styles.hint}>
              {isHotelLevel
                ? "Panorama bắt đầu là nơi khách vào đầu tiên khi bấm “Xem 360°” ở thumbnail khách sạn."
                : `Panorama bắt đầu là nơi khách vào đầu tiên khi bấm “Xem 360°” ở trang chi tiết «${scopeLabel}».`}
            </p>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.smallButton}
                disabled={busy}
                onClick={() => onSave({ nameVi: scene.nameVi, nameEn: scene.nameEn ?? "", entry: true })}
              >
                Đặt làm panorama bắt đầu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
