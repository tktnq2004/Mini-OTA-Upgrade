"use client";

import { useState } from "react";
import { ArrowSquareOutIcon, CaretDownIcon, CaretRightIcon, WarningIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import type { Room } from "@/lib/admin/types";
import type { TourScene } from "@/lib/tour/types";
import type { TourCoverage } from "./coverage";
import { HOTEL_LEVEL_LABEL } from "./linkRules";
import styles from "./TourEditor.module.css";

interface SceneRailProps {
  hotelId: number;
  scenes: TourScene[];
  rooms: Room[];
  coverage: TourCoverage;
  selectedId: string | null;
  onSelect: (sceneId: string) => void;
}

// Cột trái = CÂY panorama theo cấp: "Hành lang / Khách sạn" rồi từng phòng. Editor chỉ CHỌN
// panorama để gắn hotspot — upload/xoá panorama làm ở trang quản lý khách sạn / phòng (liên
// kết ở đây mở trang đó ở tab mới). Mỗi nhóm thu gọn được để khách sạn nhiều phòng không
// dài lê thê; nhóm chứa panorama đang mở luôn được mở.
//  - Phòng ĐÃ có panorama: nhóm riêng, kèm ⚠ nếu chưa có hotspot nào từ ngoài dẫn vào
//    (khách đi từ thumbnail hotel sẽ không tới được phòng đó).
//  - Phòng CHƯA có panorama: gom vào mục thu gọn để cột không dài vô ích.
// Nhãn "Bắt đầu" = panorama mở đầu của phạm vi (điểm vào khi bấm "Xem 360°" từ thumbnail
// hotel hoặc từ trang chi tiết phòng).
export default function SceneRail({ hotelId, scenes, rooms, coverage, selectedId, onSelect }: SceneRailProps) {
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const manageHref = `/admin/hotels/${hotelId}`;
  const knownRoomIds = new Set(rooms.map((r) => r.id));
  const hotelScenes = scenes.filter((s) => s.roomId === null);
  const roomsWithScenes = rooms.filter((r) => coverage.byRoom.has(r.id));
  const roomsWithout = rooms.filter((r) => !coverage.byRoom.has(r.id));
  // Scene của phòng đã không còn trong danh sách (hiếm) — vẫn hiện để không "mất tích".
  const orphans = scenes.filter((s) => s.roomId !== null && !knownRoomIds.has(s.roomId));

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const manageLink = (text: string) => (
    <a className={styles.railLink} href={manageHref} target="_blank" rel="noopener noreferrer">
      {text}
      <ArrowSquareOutIcon size={12} weight="bold" />
    </a>
  );

  const renderScenes = (list: TourScene[]) => (
    <div className={styles.sceneList}>
      {list.map((scene) => (
        <button
          key={scene.id}
          type="button"
          className={scene.id === selectedId ? styles.sceneCardActive : styles.sceneCard}
          onClick={() => onSelect(scene.id)}
        >
          <ImageWithFallback
            src={scene.imageUrl}
            alt=""
            crossOrigin="anonymous"
            className={styles.sceneThumb}
            fallbackClassName={styles.sceneThumb}
            fallback={<span />}
          />
          <span className={styles.sceneInfo}>
            <span className={styles.sceneName}>{scene.nameVi}</span>
            <span className={styles.sceneMeta}>
              {scene.entry && <span className={styles.badge}>Bắt đầu</span>}
              <span>{scene.hotspots.length} hotspot</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );

  // Một nhóm thu gọn được. `list` rỗng vẫn hiện tiêu đề để người dùng biết nhóm tồn tại.
  const renderGroup = (key: string, title: string, list: TourScene[], options?: { warning?: string; empty?: React.ReactNode }) => {
    const containsSelected = list.some((s) => s.id === selectedId);
    const open = containsSelected || !collapsed.has(key);
    return (
      <section key={key} className={styles.group}>
        <button type="button" className={styles.groupHeader} onClick={() => toggle(key)} aria-expanded={open}>
          {open ? <CaretDownIcon size={12} weight="bold" /> : <CaretRightIcon size={12} weight="bold" />}
          <span className={styles.groupHeaderTitle}>
            {title}
            {options?.warning && (
              <span className={styles.groupWarn} title={options.warning}>
                <WarningIcon size={13} weight="fill" />
              </span>
            )}
          </span>
          <span className={styles.groupCount}>{list.length}</span>
        </button>
        {open && (
          <>
            {options?.warning && <p className={styles.groupWarnText}>Chưa có đường đi từ hành lang vào phòng này</p>}
            {list.length > 0 ? renderScenes(list) : options?.empty}
          </>
        )}
      </section>
    );
  };

  return (
    <>
      <div className={styles.panelHeader}>
        <span>Panorama ({scenes.length})</span>
        {rooms.length > 0 && (
          <span
            className={coverage.roomsWithScenes === coverage.totalRooms ? styles.coverageFull : styles.coveragePill}
            title="Số phòng đã có panorama trên tổng số phòng của khách sạn"
          >
            {coverage.roomsWithScenes}/{coverage.totalRooms} phòng
          </span>
        )}
      </div>

      <div className={styles.scroll}>
        {renderGroup("hotel", HOTEL_LEVEL_LABEL, hotelScenes, {
          empty: <p className={styles.hint}>Chưa có panorama cấp khách sạn (hành lang, sảnh…). {manageLink("Upload ở trang quản lý khách sạn")}</p>,
        })}

        {roomsWithScenes.map((room) => {
          const info = coverage.byRoom.get(room.id);
          return renderGroup(
            `room-${room.id}`,
            room.name,
            scenes.filter((s) => s.roomId === room.id),
            { warning: info && !info.reachable ? "Chưa có hotspot nào từ hành lang hoặc phòng khác dẫn vào phòng này" : undefined }
          );
        })}

        {orphans.length > 0 && renderGroup("orphans", "Phòng khác", orphans)}

        {roomsWithout.length > 0 && (
          <div className={styles.emptyRooms}>
            <button type="button" className={styles.collapseToggle} onClick={() => setEmptyOpen((v) => !v)} aria-expanded={emptyOpen}>
              {emptyOpen ? <CaretDownIcon size={12} weight="bold" /> : <CaretRightIcon size={12} weight="bold" />}
              Phòng chưa có panorama ({roomsWithout.length})
            </button>
            {emptyOpen && (
              <div className={styles.sceneList}>
                {roomsWithout.map((room) => (
                  <div key={room.id} className={styles.emptyRoomRow}>
                    <span className={styles.sceneName}>{room.name}</span>
                  </div>
                ))}
                <p className={styles.hint}>{manageLink("Upload panorama ở trang quản lý phòng")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
