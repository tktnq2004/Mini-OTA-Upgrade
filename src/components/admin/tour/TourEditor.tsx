"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOutIcon, CheckCircleIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import PanoramaCanvas, { type PanoramaViewHandle } from "@/components/panorama/PanoramaCanvas";
import type { HotspotItem } from "@/components/panorama/types";
import { AdminApiError } from "@/lib/admin/apiClient";
import { getHotel } from "@/lib/admin/resources";
import type { Hotel } from "@/lib/admin/types";
import { saveHotspots, syncTour, updateScene } from "@/lib/tour/api";
import { normalizeYaw, yawPitchToVector } from "@/lib/tour/geometry";
import type { HotspotInput, HotspotType, TourScene, UpdateSceneInput } from "@/lib/tour/types";
import { computeCoverage } from "./coverage";
import EditorTopBar from "./EditorTopBar";
import HotspotPanel from "./HotspotPanel";
import { HOTEL_LEVEL_LABEL, isLinkAllowed } from "./linkRules";
import SceneRail from "./SceneRail";
import SceneSettings from "./SceneSettings";
import StageToolbar, { type ActiveTool } from "./StageToolbar";
import { newDraft, toDrafts, toInputs, validateDrafts, type HotspotDraft } from "./draft";
import { useDraftState } from "./draftHistory";
import { emitCursor } from "./hudBus";
import ViewControls from "./ViewControls";
import ViewHud from "./ViewHud";
import styles from "./TourEditor.module.css";

type Placing = { mode: "new"; type: HotspotType } | { mode: "move"; key: string };
type InspectorTab = "hotspot" | "panorama";

// Mỗi lần bấm nút/phím +/− đổi FOV bấy nhiêu độ.
const ZOOM_STEP = 8;

const errorText = (e: unknown, fallback: string) => (e instanceof AdminApiError || e instanceof Error ? e.message : fallback);

// Editor HOTSPOT của tour 360° (mở ở tab riêng, toàn màn hình). Panorama là dữ liệu
// gốc — upload/xoá ở trang quản lý khách sạn / phòng; ở đây chỉ CHỌN panorama từ cây
// bên trái để gắn hotspot (chuyển cảnh / thông tin), đặt tên và chọn panorama bắt
// đầu. Vì hai trang thường mở song song, danh sách tự làm mới khi tab lấy lại focus
// (không đụng bản nháp hotspot đang sửa). Bản nháp hotspot nằm ở state cục bộ
// (`draft`, có hoàn tác/làm lại) tới khi lưu — đổi panorama hoặc đóng tab khi chưa lưu đều
// được cảnh báo.
export default function TourEditor({ hotelId }: { hotelId: number }) {
  const router = useRouter();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [scenes, setScenes] = useState<TourScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { draft, apply: applyDraft, reset: resetDraft, undo, redo, canUndo, canRedo } = useDraftState();
  const [dirty, setDirty] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [placing, setPlacing] = useState<Placing | null>(null);
  const [lookAt, setLookAt] = useState<{ yaw: number; pitch: number; key: number } | undefined>();

  const [railOpen, setRailOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const viewRef = useRef<PanoramaViewHandle | null>(null);
  const [tab, setTab] = useState<InspectorTab>("hotspot");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const skipUnloadRef = useRef(false);
  const refreshingRef = useRef(false);

  const rooms = useMemo(() => hotel?.rooms ?? [], [hotel]);
  const roomOrder = useMemo(() => rooms.map((r) => r.id), [rooms]);
  const coverage = useMemo(() => computeCoverage(scenes, roomOrder), [scenes, roomOrder]);
  const selectedScene = scenes.find((s) => s.id === selectedId) ?? null;

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3800);
  };

  const roomName = useCallback((roomId: number) => rooms.find((r) => r.id === roomId)?.name ?? `Phòng #${roomId}`, [rooms]);
  const scopeLabel = useCallback(
    (scene: TourScene) => (scene.roomId === null ? HOTEL_LEVEL_LABEL : roomName(scene.roomId)),
    [roomName]
  );

  // Đặt panorama đang chọn + nạp lại bản nháp từ dữ liệu server của panorama đó.
  const openScene = (list: TourScene[], sceneId: string | null) => {
    const scene = list.find((s) => s.id === sceneId) ?? null;
    setSelectedId(scene?.id ?? null);
    resetDraft(scene ? toDrafts(scene.hotspots) : []);
    setDirty(false);
    setSelectedKey(null);
    setPlacing(null);
    setError("");
  };

  // Đồng bộ với server (BE tự sinh scene cho panorama mới upload) mà KHÔNG đụng vào
  // bản nháp đang sửa.
  const reloadData = useCallback(async () => {
    const [h, tour] = await Promise.all([getHotel(hotelId), syncTour(hotelId)]);
    setHotel(h);
    setScenes(tour.scenes);
    return tour;
  }, [hotelId]);

  const load = () => {
    setLoading(true);
    setLoadError("");
    reloadData()
      .then((tour) => openScene(tour.scenes, tour.startSceneId ?? tour.scenes[0]?.id ?? null))
      .catch((e) => setLoadError(errorText(e, "Không tải được dữ liệu panorama")))
      .finally(() => setLoading(false));
  };
  useEffect(load, [hotelId]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- tải dữ liệu ban đầu từ API, một external system

  // Làm mới danh sách khi tab lấy lại focus: người dùng vừa upload/xoá panorama ở
  // tab quản lý. Nếu panorama ĐANG MỞ đã bị xoá thì chuyển sang panorama khác và báo.
  // `focus` và `visibilitychange` thường nổ cùng lúc nên chặn chạy chồng.
  const refreshFromServer = async () => {
    if (document.visibilityState !== "visible" || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const tour = await reloadData();
      if (selectedId && !tour.scenes.some((s) => s.id === selectedId)) {
        openScene(tour.scenes, tour.startSceneId ?? tour.scenes[0]?.id ?? null);
        setError("Panorama đang mở đã bị xoá ở trang quản lý — đã chuyển sang panorama khác");
      }
    } catch {
      // Im lặng: lần lấy lại focus sau sẽ thử lại.
    } finally {
      refreshingRef.current = false;
    }
  };
  const refreshRef = useRef(refreshFromServer);
  useEffect(() => {
    refreshRef.current = refreshFromServer;
  });
  useEffect(() => {
    const onFocus = () => void refreshRef.current();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // Cảnh báo khi đóng/tải lại tab lúc còn hotspot chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (skipUnloadRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const confirmDiscard = () => !dirty || window.confirm("Panorama hiện tại có hotspot chưa lưu. Bỏ các thay đổi đó?");

  const handleSelectScene = (sceneId: string) => {
    if (sceneId === selectedId || !confirmDiscard()) return;
    openScene(scenes, sceneId);
  };

  const patchDraft = (key: string, patch: Partial<HotspotDraft>) => {
    // Cùng khoá -> gõ liên tiếp trong 1 ô chỉ tính là một bước hoàn tác.
    applyDraft((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)), `edit:${key}:${Object.keys(patch).join(",")}`);
    setDirty(true);
  };

  const handlePick = useCallback(
    (yaw: number, pitch: number) => {
      if (!placing) return;
      if (placing.mode === "new") {
        const created = newDraft(placing.type, yaw, pitch);
        applyDraft((prev) => [...prev, created]);
        setSelectedKey(created.key);
        setTab("hotspot");
        setInspectorOpen(true);
      } else {
        applyDraft((prev) => prev.map((d) => (d.key === placing.key ? { ...d, yaw, pitch } : d)));
      }
      setDirty(true);
      setPlacing(null);
    },
    [placing, applyDraft]
  );

  // Kéo marker trực tiếp trên ảnh: gộp cả lần kéo thành một bước hoàn tác.
  const handleMoveHotspot = useCallback(
    (key: string, yaw: number, pitch: number) => {
      applyDraft((prev) => prev.map((d) => (d.key === key ? { ...d, yaw, pitch } : d)), `drag:${key}`);
      setSelectedKey(key);
      setDirty(true);
    },
    [applyDraft]
  );

  const handleSelectHotspot = (key: string) => {
    setSelectedKey(key);
    const d = draft.find((x) => x.key === key);
    if (d) setLookAt({ yaw: d.yaw, pitch: d.pitch, key: Date.now() });
  };

  const handleRemoveHotspot = (key: string) => {
    applyDraft((prev) => prev.filter((d) => d.key !== key));
    setSelectedKey(null);
    setDirty(true);
  };

  const handleDuplicateHotspot = (key: string) => {
    const source = draft.find((d) => d.key === key);
    if (!source) return;
    // Lệch sang bên một chút để bản sao không đè kín bản gốc.
    const copy: HotspotDraft = {
      ...source,
      key: crypto.randomUUID(),
      yaw: normalizeYaw(source.yaw + 8),
      nameVi: source.nameVi ? `${source.nameVi} (bản sao)` : "",
    };
    applyDraft((prev) => [...prev, copy]);
    setSelectedKey(copy.key);
    setDirty(true);
  };

  // Giữ hotspot đang chọn nếu nó vẫn còn sau khi hoàn tác/làm lại (form không bị đóng đột ngột).
  const afterHistoryStep = (restored: HotspotDraft[] | null) => {
    if (!restored) return;
    setDirty(true);
    setSelectedKey((current) => (current && restored.some((d) => d.key === current) ? current : null));
  };
  const handleUndo = () => afterHistoryStep(undo());
  const handleRedo = () => afterHistoryStep(redo());

  // Lỗi 404/409 khi lưu thường nghĩa là panorama (nguồn hoặc đích) vừa bị xoá ở tab
  // quản lý — báo rõ và tải lại danh sách để dropdown "Đi tới" phản ánh đúng.
  const handleSaveError = (e: unknown, fallback: string) => {
    setError(errorText(e, fallback));
    if (e instanceof AdminApiError && (e.status === 404 || e.status === 409)) void refreshRef.current();
  };

  const handleSaveHotspots = async () => {
    if (!selectedScene || busy || !dirty) return;
    const invalid = validateDrafts(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    // Đích đã bị xoá ở tab khác, hoặc vi phạm luật liên kết: báo ngay, khỏi chờ server.
    const badLink = draft.find((d) => {
      if (d.type !== "NAVIGATION" || !d.targetSceneId) return false;
      const target = scenes.find((s) => s.id === d.targetSceneId);
      return !target || !isLinkAllowed(selectedScene, target);
    });
    if (badLink) {
      setError(`Hotspot «${badLink.nameVi.trim() || "chưa đặt tên"}» trỏ tới panorama không còn hợp lệ — hãy chọn lại đích`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveHotspots(selectedScene.id, toInputs(draft));
      setScenes((prev) => prev.map((s) => (s.id === selectedScene.id ? { ...s, hotspots: saved } : s)));
      resetDraft(toDrafts(saved));
      setDirty(false);
      setSelectedKey(null);
      flash("Đã lưu hotspot");
    } catch (e) {
      handleSaveError(e, "Lưu hotspot thất bại");
    } finally {
      setBusy(false);
    }
  };

  // Tạo hotspot quay lại trong panorama đích, trỏ về panorama hiện tại. Lưu thẳng
  // panorama đích (không đi qua bản nháp) — đặt tạm ở hướng đối diện để người
  // dùng mở panorama đó chỉnh lại cho khớp ảnh. Luật liên kết đối xứng nên chiều
  // ngược lại hợp lệ khi chiều thuận hợp lệ; vẫn kiểm để bắt dữ liệu cũ.
  const handleCreateReverse = async (key: string) => {
    const source = draft.find((d) => d.key === key);
    const current = selectedScene;
    const target = scenes.find((s) => s.id === source?.targetSceneId);
    if (!source || !current || !target) return;
    if (!isLinkAllowed(target, current)) {
      setError(`Không thể liên kết «${target.nameVi}» → «${current.nameVi}» theo luật liên kết`);
      return;
    }
    if (target.hotspots.some((h) => h.targetSceneId === current.id)) {
      setError(`«${target.nameVi}» đã có hotspot trỏ về «${current.nameVi}»`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const reverse: HotspotInput = {
        type: "NAVIGATION",
        yaw: normalizeYaw(source.yaw + 180),
        pitch: 0,
        nameVi: current.nameVi,
        nameEn: current.nameEn ?? "",
        descriptionVi: "",
        descriptionEn: "",
        targetSceneId: current.id,
      };
      const saved = await saveHotspots(target.id, [...toInputs(toDrafts(target.hotspots)), reverse]);
      setScenes((prev) => prev.map((s) => (s.id === target.id ? { ...s, hotspots: saved } : s)));
      flash(`Đã tạo hotspot quay lại trong «${target.nameVi}» — mở panorama đó để chỉnh vị trí`);
    } catch (e) {
      handleSaveError(e, "Tạo hotspot quay lại thất bại");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateScene = async (input: UpdateSceneInput) => {
    if (!selectedScene) return;
    setBusy(true);
    setError("");
    try {
      await updateScene(selectedScene.id, input);
      await reloadData();
      flash("Đã cập nhật panorama");
    } catch (e) {
      handleSaveError(e, "Cập nhật panorama thất bại");
    } finally {
      setBusy(false);
    }
  };

  // Đóng tab: window.close() chỉ chạy được với tab do script/link mở; nếu
  // trình duyệt từ chối thì quay về trang chi tiết khách sạn.
  const handleClose = () => {
    if (dirty && !window.confirm("Có hotspot chưa lưu. Đóng và bỏ các thay đổi đó?")) return;
    skipUnloadRef.current = true;
    window.close();
    window.setTimeout(() => {
      skipUnloadRef.current = false;
      router.push(`/admin/hotels/${hotelId}`);
    }, 250);
  };

  const handleToolChange = (tool: ActiveTool) => {
    setPlacing(tool === "select" ? null : { mode: "new", type: tool });
  };

  // Phím tắt: N / I chọn công cụ, Esc huỷ, Delete xoá hotspot đang chọn, Ctrl+S lưu, Ctrl+Z /
  // Ctrl+Shift+Z hoàn tác/làm lại, Ctrl+D nhân bản, F chế độ tập trung, +/−/0 điều khiển góc
  // nhìn. Bỏ qua khi đang gõ vào ô nhập (để Ctrl+Z gõ chữ vẫn là của trình duyệt). Đọc
  // hàm/state mới nhất qua ref để chỉ cần đăng ký listener một lần.
  const shortcutsRef = useRef({ save: handleSaveHotspots, remove: handleRemoveHotspot, duplicate: handleDuplicateHotspot, undo: handleUndo, redo: handleRedo, selectedKey });
  useEffect(() => {
    shortcutsRef.current = { save: handleSaveHotspots, remove: handleRemoveHotspot, duplicate: handleDuplicateHotspot, undo: handleUndo, redo: handleRedo, selectedKey };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctx = shortcutsRef.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "s") {
        e.preventDefault();
        ctx.save();
        return;
      }
      const el = e.target as HTMLElement | null;
      const typing = el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
      if (typing) return;

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) ctx.redo();
        else ctx.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        ctx.redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (ctx.selectedKey) ctx.duplicate(ctx.selectedKey);
        return;
      }
      if (mod || e.altKey) return;

      if (e.key === "Escape") setPlacing(null);
      else if (key === "n") setPlacing({ mode: "new", type: "NAVIGATION" });
      else if (key === "i") setPlacing({ mode: "new", type: "INFO" });
      else if (key === "f") setFocusMode((v) => !v);
      else if (e.key === "+" || e.key === "=") viewRef.current?.zoom(-ZOOM_STEP);
      else if (e.key === "-" || e.key === "_") viewRef.current?.zoom(ZOOM_STEP);
      else if (e.key === "0") viewRef.current?.reset();
      else if ((e.key === "Delete" || e.key === "Backspace") && ctx.selectedKey) {
        e.preventDefault();
        ctx.remove(ctx.selectedKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canvasHotspots: HotspotItem[] = useMemo(
    () =>
      draft.map((d) => {
        const target = d.type === "NAVIGATION" ? scenes.find((s) => s.id === d.targetSceneId) : undefined;
        return {
          id: d.key,
          name: d.nameVi || "(chưa đặt tên)",
          selected: d.key === selectedKey,
          position: yawPitchToVector(d.yaw, d.pitch),
          type: d.type,
          onPress: () => {
            setSelectedKey(d.key);
            setTab("hotspot");
            setInspectorOpen(true);
          },
          previewImageUrl: target?.imageUrl,
          previewLabel: target?.nameVi,
        };
      }),
    [draft, selectedKey, scenes]
  );

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>Đang tải panorama...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <WarningCircleIcon size={32} weight="light" />
          <p style={{ margin: 0 }}>{loadError}</p>
          <button type="button" className={styles.primaryButton} onClick={load}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const activeTool: ActiveTool = placing?.mode === "new" ? placing.type : "select";
  const hint =
    placing?.mode === "new"
      ? `Bấm lên ảnh để đặt hotspot ${placing.type === "NAVIGATION" ? "chuyển cảnh" : "thông tin"} · Esc để huỷ`
      : placing?.mode === "move"
        ? "Bấm lên ảnh để chọn vị trí mới · Esc để huỷ"
        : null;

  return (
    <div className={styles.root}>
      <EditorTopBar
        hotelName={hotel?.name ?? ""}
        scopeLabel={selectedScene ? scopeLabel(selectedScene) : null}
        sceneName={selectedScene?.nameVi ?? null}
        dirty={dirty}
        busy={busy}
        canUndo={canUndo}
        canRedo={canRedo}
        railOpen={railOpen}
        inspectorOpen={inspectorOpen}
        onClose={handleClose}
        onSave={handleSaveHotspots}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleRail={() => setRailOpen((v) => !v)}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
      />

      <div className={styles.body}>
        {railOpen && !focusMode && (
          <aside className={styles.rail}>
            <SceneRail
              hotelId={hotelId}
              scenes={scenes}
              rooms={rooms}
              coverage={coverage}
              selectedId={selectedId}
              onSelect={handleSelectScene}
            />
          </aside>
        )}

        <main className={styles.stage}>
          {selectedScene ? (
            <>
              <PanoramaCanvas
                ref={viewRef}
                imageUrl={selectedScene.imageUrl}
                hotspots={canvasHotspots}
                onPick={placing ? handlePick : undefined}
                onHover={emitCursor}
                onMoveHotspot={handleMoveHotspot}
                lookAt={lookAt}
                crosshair={Boolean(placing)}
              />
              <div className={styles.floatTop}>
                <StageToolbar tool={activeTool} onChange={handleToolChange} />
              </div>
              <ViewHud viewRef={viewRef} />
              <ViewControls
                focusMode={focusMode}
                onZoomIn={() => viewRef.current?.zoom(-ZOOM_STEP)}
                onZoomOut={() => viewRef.current?.zoom(ZOOM_STEP)}
                onReset={() => viewRef.current?.reset()}
                onToggleFocus={() => setFocusMode((v) => !v)}
              />
              {hint && <div className={styles.floatBottomActive}>{hint}</div>}
            </>
          ) : (
            <div className={styles.emptyStage}>
              <p className={styles.emptyTitle}>Khách sạn này chưa có panorama nào</p>
              <p className={styles.hint} style={{ maxWidth: 400 }}>
                Upload ảnh 360° ở trang quản lý khách sạn (hành lang, sảnh…) và ở từng phòng. Quay lại tab này là thấy ngay
                trong danh sách bên trái — sau đó mới gắn hotspot để nối chúng lại.
              </p>
              <a
                className={styles.primaryButton}
                href={`/admin/hotels/${hotelId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                Mở trang quản lý khách sạn
                <ArrowSquareOutIcon size={14} weight="bold" />
              </a>
            </div>
          )}

          <div className={styles.toasts}>
            {error && (
              <div className={styles.toastError} role="alert">
                <WarningCircleIcon className={styles.toastIcon} size={16} weight="fill" color="var(--color-error)" />
                <span>{error}</span>
                <button type="button" className={styles.toastClose} onClick={() => setError("")} aria-label="Đóng thông báo">
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
        </main>

        {inspectorOpen && !focusMode && selectedScene && (
          <aside className={styles.inspector}>
            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "hotspot"}
                className={tab === "hotspot" ? styles.tabActive : styles.tab}
                onClick={() => setTab("hotspot")}
              >
                Hotspot ({draft.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "panorama"}
                className={tab === "panorama" ? styles.tabActive : styles.tab}
                onClick={() => setTab("panorama")}
              >
                Panorama
              </button>
            </div>
            <div className={styles.scroll}>
              {tab === "hotspot" ? (
                <HotspotPanel
                  drafts={draft}
                  selectedKey={selectedKey}
                  currentScene={selectedScene}
                  scenes={scenes}
                  roomOrder={roomOrder}
                  roomName={roomName}
                  disabled={busy}
                  onSelect={handleSelectHotspot}
                  onChange={patchDraft}
                  onRemove={handleRemoveHotspot}
                  onMove={(key) => setPlacing({ mode: "move", key })}
                  onDuplicate={handleDuplicateHotspot}
                  onCreateReverse={handleCreateReverse}
                />
              ) : (
                <SceneSettings
                  key={selectedScene.id}
                  hotelId={hotelId}
                  scene={selectedScene}
                  scopeLabel={scopeLabel(selectedScene)}
                  busy={busy}
                  onSave={handleUpdateScene}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
