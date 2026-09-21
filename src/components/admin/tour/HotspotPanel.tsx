"use client";

import { useState } from "react";
import { ArrowRightIcon, ArrowsLeftRightIcon, CrosshairIcon, InfoIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import controls from "@/styles/controls.module.css";
import { normalizeYaw } from "@/lib/tour/geometry";
import type { TourScene } from "@/lib/tour/types";
import type { HotspotDraft } from "./draft";
import LangTabs, { type Lang } from "./LangTabs";
import { groupTargets, isLinkAllowed } from "./linkRules";
import styles from "./TourEditor.module.css";

interface HotspotPanelProps {
  drafts: HotspotDraft[];
  selectedKey: string | null;
  /** Panorama đang mở + toàn bộ panorama của hotel — để lọc đích theo luật liên kết. */
  currentScene: TourScene;
  scenes: TourScene[];
  roomOrder: number[];
  roomName: (roomId: number) => string;
  disabled: boolean;
  onSelect: (key: string) => void;
  onChange: (key: string, patch: Partial<HotspotDraft>) => void;
  onRemove: (key: string) => void;
  onMove: (key: string) => void;
  onCreateReverse: (key: string) => void;
}

export default function HotspotPanel({
  drafts,
  selectedKey,
  currentScene,
  scenes,
  roomOrder,
  roomName,
  disabled,
  onSelect,
  onChange,
  onRemove,
  onMove,
  onCreateReverse,
}: HotspotPanelProps) {
  const [lang, setLang] = useState<Lang>("vi");
  const selected = drafts.find((d) => d.key === selectedKey) ?? null;
  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  const targetGroups = groupTargets(currentScene, scenes, roomOrder, roomName);
  const targetLabel = (id: string | null) => (id ? sceneById.get(id)?.nameVi : undefined);
  // Đích không còn hợp lệ: panorama đã bị xoá, hoặc vi phạm luật (dữ liệu cũ).
  const isTargetInvalid = (id: string | null) => {
    if (!id) return false;
    const target = sceneById.get(id);
    return !target || !isLinkAllowed(currentScene, target);
  };

  return (
    <div className={styles.section}>
      {drafts.length === 0 ? (
        <p className={styles.hint}>
          Chưa có hotspot. Chọn công cụ <strong>Chuyển cảnh</strong> (N) hoặc <strong>Thông tin</strong> (I) phía trên
          ảnh rồi bấm vào vị trí muốn đặt.
        </p>
      ) : (
        <div className={styles.hotspotList}>
          {drafts.map((d, i) => (
            <button
              key={d.key}
              type="button"
              className={d.key === selectedKey ? styles.hotspotRowActive : styles.hotspotRow}
              onClick={() => onSelect(d.key)}
            >
              <span className={styles.typeIcon}>
                {d.type === "NAVIGATION" ? <ArrowRightIcon size={13} weight="bold" /> : <InfoIcon size={13} weight="bold" />}
              </span>
              <span className={styles.hotspotLabel}>
                {d.nameVi || <em style={{ color: "var(--color-text-faint)" }}>(chưa đặt tên) #{i + 1}</em>}
                {d.type === "NAVIGATION" && targetLabel(d.targetSceneId) && (
                  <span className={styles.hotspotTarget}> → {targetLabel(d.targetSceneId)}</span>
                )}
              </span>
              {d.type === "NAVIGATION" && isTargetInvalid(d.targetSceneId) && (
                <span className={styles.groupWarn} title="Liên kết không còn hợp lệ — hãy chọn lại panorama đích">
                  <WarningIcon size={14} weight="fill" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className={`${styles.section} ${styles.divideTop}`}>
          <div className={styles.segmented} role="group" aria-label="Loại hotspot">
            {(["NAVIGATION", "INFO"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={selected.type === type ? styles.segmentActive : styles.segment}
                onClick={() => selected.type !== type && onChange(selected.key, { type, targetSceneId: null })}
              >
                {type === "NAVIGATION" ? <ArrowRightIcon size={14} weight="bold" /> : <InfoIcon size={14} weight="bold" />}
                {type === "NAVIGATION" ? "Chuyển cảnh" : "Thông tin"}
              </button>
            ))}
          </div>

          <LangTabs
            value={lang}
            onChange={setLang}
            missing={{
              en: !selected.nameEn.trim() || (selected.type === "INFO" && !selected.descriptionEn.trim()),
            }}
          />

          <div className={controls.field}>
            <label className={controls.label}>{lang === "vi" ? "Tên hiển thị (VI) *" : "Tên hiển thị (EN)"}</label>
            <input
              className={controls.input}
              value={lang === "vi" ? selected.nameVi : selected.nameEn}
              onChange={(e) => onChange(selected.key, lang === "vi" ? { nameVi: e.target.value } : { nameEn: e.target.value })}
              placeholder={lang === "vi" ? "vd. Phòng ngủ" : "e.g. Bedroom"}
            />
          </div>

          {selected.type === "NAVIGATION" ? (
            <div className={controls.field}>
              <label className={controls.label}>Đi tới panorama *</label>
              <select
                className={controls.select}
                value={selected.targetSceneId ?? ""}
                onChange={(e) => onChange(selected.key, { targetSceneId: e.target.value || null })}
              >
                <option value="">— Chọn panorama —</option>
                {targetGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {isTargetInvalid(selected.targetSceneId) && (
                  <optgroup label="Không hợp lệ — cần chọn lại">
                    <option value={selected.targetSceneId ?? ""}>
                      {targetLabel(selected.targetSceneId) ?? "(panorama đã bị xoá)"}
                    </option>
                  </optgroup>
                )}
              </select>
            </div>
          ) : (
            <div className={controls.field}>
              <label className={controls.label}>{lang === "vi" ? "Mô tả (VI)" : "Mô tả (EN)"}</label>
              <textarea
                className={styles.textarea}
                value={lang === "vi" ? selected.descriptionVi : selected.descriptionEn}
                onChange={(e) =>
                  onChange(selected.key, lang === "vi" ? { descriptionVi: e.target.value } : { descriptionEn: e.target.value })
                }
              />
            </div>
          )}

          <div className={styles.section}>
            <p className={styles.sectionTitle}>Vị trí trên mặt cầu</p>
            <div className={styles.coordRow}>
              <div className={controls.field}>
                <label className={controls.label}>Yaw (°)</label>
                <input
                  className={controls.input}
                  type="number"
                  step="0.5"
                  value={Number(selected.yaw.toFixed(2))}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) onChange(selected.key, { yaw: normalizeYaw(v) });
                  }}
                />
              </div>
              <div className={controls.field}>
                <label className={controls.label}>Pitch (°)</label>
                <input
                  className={controls.input}
                  type="number"
                  step="0.5"
                  min={-90}
                  max={90}
                  value={Number(selected.pitch.toFixed(2))}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) onChange(selected.key, { pitch: Math.max(-90, Math.min(90, v)) });
                  }}
                />
              </div>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.smallButton} disabled={disabled} onClick={() => onMove(selected.key)}>
              <CrosshairIcon size={14} weight="bold" />
              Đặt lại vị trí
            </button>
            {selected.type === "NAVIGATION" && selected.targetSceneId && (
              <button
                type="button"
                className={styles.smallButton}
                disabled={disabled}
                onClick={() => onCreateReverse(selected.key)}
                title="Thêm hotspot quay lại panorama này vào panorama đích (lưu ngay)"
              >
                <ArrowsLeftRightIcon size={14} weight="bold" />
                Tạo hotspot quay lại
              </button>
            )}
            <button type="button" className={styles.smallButtonDanger} onClick={() => onRemove(selected.key)}>
              <TrashIcon size={14} weight="bold" />
              Xoá
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
