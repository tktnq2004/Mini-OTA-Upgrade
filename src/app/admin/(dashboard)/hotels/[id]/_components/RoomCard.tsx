"use client";

import { useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import MediaGallery from "@/components/media/MediaGallery";
import ThumbnailUploader from "@/components/media/ThumbnailUploader";
import { AdminApiError, conflictLines } from "@/lib/admin/apiClient";
import { deleteRoom, updateRoom } from "@/lib/admin/resources";
import type { Room, RoomType } from "@/lib/admin/types";
import { formatVnd } from "@/lib/format";
import { roomAmenities, roomCapacity } from "@/lib/hotels/roomType";

interface RoomCardProps {
    room: Room;
    // Loại phòng của hotel này — để đổi loại.
    roomTypes: RoomType[];
    onChanged: () => void;
}

// 1 phòng trong trang chi tiết hotel. Sức chứa, chính sách, tiện nghi, hướng nhìn thuộc loại
// phòng (sửa ở mục Loại phòng phía trên); ở đây chỉ sửa tên, giá, loại, mô tả, ảnh.
export default function RoomCard({ room, roomTypes, onChanged }: RoomCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [form, setForm] = useState({
        name: room.name,
        price: room.price,
        roomTypeId: room.roomType?.id ?? 0,
        thumbnail: room.thumbnail,
        description: room.description,
    });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.roomTypeId) {
            setError("Chọn loại phòng");
            return;
        }
        setError("");
        setSaving(true);
        try {
            await updateRoom({ roomId: room.id, ...form });
            onChanged();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    // Xoá phòng kéo theo toàn bộ ảnh của phòng. Nếu panorama của phòng đang được hotspot
    // Ở NGOÀI phòng (thường là "vào phòng" ở hành lang) trỏ tới, BE trả 409 kèm danh sách —
    // liệt kê rõ sẽ mất gì rồi hỏi lại mới xoá kèm (hotspot khác không bị ảnh hưởng).
    const handleDeleteRoom = async () => {
        if (!confirm(`Xoá phòng "${room.name}"? Toàn bộ ảnh của phòng (ảnh đại diện và panorama 360°) cũng bị xoá vĩnh viễn.`)) return;
        try {
            await deleteRoom(room.id);
            onChanged();
        } catch (e) {
            if (e instanceof AdminApiError && e.status === 409) {
                const proceed = confirm(
                    `Panorama của phòng "${room.name}" đang được hotspot khác liên kết tới:\n\n` +
                        conflictLines(e)
                            .map((line) => `• ${line}`)
                            .join("\n") +
                        "\n\nXoá phòng sẽ gỡ luôn các hotspot trên (các hotspot khác không bị ảnh hưởng). Vẫn xoá?"
                );
                if (!proceed) return;
                try {
                    await deleteRoom(room.id, true);
                    onChanged();
                } catch (e2) {
                    setError(e2 instanceof AdminApiError ? e2.message : "Xoá thất bại");
                }
                return;
            }
            setError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    return (
        <div className={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <strong>
                        #{room.id} — {room.name}
                    </strong>
                    <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                        {formatVnd(room.price)} / đêm ·{" "}
                        {room.roomType ? `${room.roomType.roomTypeName} · ${roomCapacity(room)} khách` : "Chưa gán loại phòng"}
                    </div>
                </div>
                <div className={styles.rowActions}>
                    <button type="button" className={styles.linkButton} onClick={() => setExpanded((v) => !v)}>
                        {expanded ? "Thu gọn" : "Sửa"}
                    </button>
                    <button type="button" className={styles.linkButtonDanger} onClick={handleDeleteRoom}>
                        Xoá
                    </button>
                </div>
            </div>

            <div className={styles.chipRow} style={{ marginTop: 10 }}>
                {roomAmenities(room).map((a) => (
                    <span key={a.id} className={styles.chip}>
                        {a.name}
                    </span>
                ))}
                {roomAmenities(room).length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>Loại phòng chưa có tiện nghi</span>
                )}
            </div>

            {expanded && (
                <div className={styles.stack} style={{ marginTop: 14 }}>
                    <div className={controls.field}>
                        <label className={controls.label}>Ảnh thumbnail</label>
                        <ThumbnailUploader ownerType="ROOM" ownerId={room.id} />
                    </div>
                    <div className={controls.field}>
                        <label className={controls.label}>Ảnh panorama 360°</label>
                        <MediaGallery ownerType="ROOM" ownerId={room.id} kind="PANORAMA" />
                    </div>
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Tên phòng</label>
                            <input className={controls.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Giá / đêm</label>
                            <input
                                className={controls.input}
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Loại phòng</label>
                            <select
                                className={controls.select}
                                value={form.roomTypeId || ""}
                                onChange={(e) => setForm({ ...form, roomTypeId: Number(e.target.value) })}
                            >
                                <option value="">— Chọn loại phòng —</option>
                                {roomTypes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.roomTypeName} · tối đa {t.capacity} khách
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>URL ảnh thumbnail</label>
                            <input
                                className={controls.input}
                                value={form.thumbnail}
                                onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                            />
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Mô tả</label>
                            <textarea
                                className={controls.textarea}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {error && <p className={controls.error}>{error}</p>}
                    <div className={styles.formActions}>
                        <button type="button" className={controls.button} onClick={handleSave} disabled={saving}>
                            {saving ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </div>
            )}
            {!expanded && error && <p className={controls.error}>{error}</p>}
        </div>
    );
}
