"use client";

import type { ReactNode } from "react";
import styles from "../TourEditor.module.css";

export type InspectorTab = "hotspot" | "panorama";

interface InspectorPanelProps {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  hotspotCount: number;
  // Nội dung 2 tab do TourEditor dựng sẵn (cần nhiều state/handler của editor).
  hotspotPanel: ReactNode;
  sceneSettings: ReactNode;
}

// Cột phải của editor: 2 tab "Hotspot" (danh sách + form hotspot) và "Panorama"
// (tên, panorama bắt đầu...).
export default function InspectorPanel({ tab, onTabChange, hotspotCount, hotspotPanel, sceneSettings }: InspectorPanelProps) {
  return (
    <aside className={styles.inspector}>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "hotspot"}
          className={tab === "hotspot" ? styles.tabActive : styles.tab}
          onClick={() => onTabChange("hotspot")}
        >
          Hotspot ({hotspotCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "panorama"}
          className={tab === "panorama" ? styles.tabActive : styles.tab}
          onClick={() => onTabChange("panorama")}
        >
          Panorama
        </button>
      </div>
      <div className={styles.scroll}>{tab === "hotspot" ? hotspotPanel : sceneSettings}</div>
    </aside>
  );
}
