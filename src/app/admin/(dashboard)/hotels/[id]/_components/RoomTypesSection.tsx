"use client";

import { useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import ChipPicker from "@/components/admin/ChipPicker";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createRoomType, deleteRoomType, updateRoomType } from "@/lib/admin/resources";
import type { Amenity, Room, RoomType, RoomTypeInput, View } from "@/lib/admin/types";
import { roomTypePolicyLabels } from "@/lib/hotels/roomType";

interface RoomTypesSectionProps {
    hotelId: number;
    roomTypes: RoomType[];
    rooms: Room[];
    amenities: Amenity[];
    views: View[];
    onChanged: () => void;
}

const EMPTY_TYPE: RoomTypeInput = {
    roomTypeName: "",
    capacity: 2,
    allowSmoking: false,
    allowPets: false,
    cancellationPolicy: true,
    amenityIds: [],
    viewIds: [],
};

const toInput = (t: RoomType): RoomTypeInput => ({
    roomTypeName: t.roomTypeName,
    capacity: t.capacity,
    allowSmoking: t.allowSmoking,
    allowPets: t.allowPets,
    cancellationPolicy: t.cancellationPolicy,
    amenityIds: t.amenities.map((a) => a.id),
    viewIds: t.views.map((v) => v.id),
});

// Loại phòng của 1 hotel (mỗi hotel tự định nghĩa). Sức chứa, chính sách, tiện nghi, hướng
// nhìn đặt ở đây và áp cho mọi phòng cùng loại. Xoá loại còn phòng bị chặn.
export default function RoomTypesSection({ hotelId, roomTypes, rooms, amenities, views, onChanged }: RoomTypesSectionProps) {
    // "new" = đang thêm, số = đang sửa loại có id đó, null = không mở editor nào.
    const [editing, setEditing] = useState<"new" | number | null>(null);
    const [error, setError] = useState("");

    const roomCount = (typeId: number) => rooms.filter((r) => r.roomType?.id === typeId).length;

    const handleDelete = async (t: RoomType) => {
        const count = roomCount(t.id);
        if (count > 0) {
            setError(`Loại "${t.roomTypeName}" còn ${count} phòng — chuyển các phòng sang loại khác hoặc xoá chúng trước.`);
            return;
        }
        if (!confirm(`Xoá loại phòng "${t.roomTypeName}"?`)) return;
        setError("");
        try {
            await deleteRoomType(t.id);
            onChanged();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Xoá loại phòng thất bại");
        }
    };

    const handleSaved = () => {
        setEditing(null);
        onChanged();
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                    Loại phòng ({roomTypes.length})
                </h2>
                <button
                    type="button"
                    className={controls.button}
                    onClick={() => setEditing((v) => (v === "new" ? null : "new"))}
                >
                    {editing === "new" ? "Đóng" : "Thêm loại phòng"}
                </button>
            </div>

            {error && <p className={controls.error}>{error}</p>}

            <div className={styles.stack}>
                {editing === "new" && (
                    <RoomTypeEditor
                        key="new"
                        hotelId={hotelId}
                        roomType={null}
                        amenities={amenities}
                        views={views}
                        onSaved={handleSaved}
                        onCancel={() => setEditing(null)}
                    />
                )}
                {roomTypes.map((t) =>
                    editing === t.id ? (
                        <RoomTypeEditor
                            key={t.id}
                            hotelId={hotelId}
                            roomType={t}
                            amenities={amenities}
                            views={views}
                            onSaved={handleSaved}
                            onCancel={() => setEditing(null)}
                        />
                    ) : (
                        <div key={t.id} className={styles.card}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                <div>
                                    <strong>
                                        #{t.id} — {t.roomTypeName}
                                    </strong>
                                    <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                                        Tối đa {t.capacity} khách · {roomTypePolicyLabels(t).join(" · ")} · {roomCount(t.id)} phòng
                                    </div>
                                </div>
                                <div className={styles.rowActions}>
                                    <button type="button" className={styles.linkButton} onClick={() => setEditing(t.id)}>
                                        Sửa
                                    </button>
                                    <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(t)}>
                                        Xoá
                                    </button>
                                </div>
                            </div>
                            <div className={styles.chipRow} style={{ marginTop: 10 }}>
                                {[...t.amenities, ...t.views].map((item) => (
                                    <span key={`${item.id}-${item.name}`} className={styles.chip}>
                                        {item.name}
                                    </span>
                                ))}
                                {t.amenities.length + t.views.length === 0 && (
                                    <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>Chưa có tiện nghi / hướng nhìn</span>
                                )}
                            </div>
                        </div>
                    )
                )}
                {roomTypes.length === 0 && editing !== "new" && (
                    <p className={styles.emptyState}>Chưa có loại phòng nào — tạo loại trước rồi mới thêm phòng.</p>
                )}
            </div>
        </div>
    );
}

interface RoomTypeEditorProps {
    hotelId: number;
    roomType: RoomType | null;
    amenities: Amenity[];
    views: View[];
    onSaved: () => void;
    onCancel: () => void;
}

function RoomTypeEditor({ hotelId, roomType, amenities, views, onSaved, onCancel }: RoomTypeEditorProps) {
    const [form, setForm] = useState<RoomTypeInput>(() => (roomType ? toInput(roomType) : EMPTY_TYPE));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const toggle = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = { ...form, roomTypeName: form.roomTypeName.trim() };
        if (!input.roomTypeName) return setError("Nhập tên loại phòng");
        if (!(input.capacity >= 1)) return setError("Sức chứa ít nhất là 1");
        setError("");
        setSaving(true);
        try {
            if (roomType) await updateRoomType(roomType.id, input);
            else await createRoomType(hotelId, input);
            onSaved();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Lưu loại phòng thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className={styles.card} onSubmit={handleSubmit}>
            <h2 className={styles.cardTitle}>{roomType ? `Sửa loại phòng #${roomType.id}` : "Thêm loại phòng"}</h2>
            <div className={styles.formGrid}>
                <div className={controls.field}>
                    <label className={controls.label}>Tên loại phòng</label>
                    <input
                        className={controls.input}
                        maxLength={100}
                        value={form.roomTypeName}
                        onChange={(e) => setForm({ ...form, roomTypeName: e.target.value })}
                    />
                </div>
                <div className={controls.field}>
                    <label className={controls.label}>Sức chứa (khách / phòng)</label>
                    <input
                        className={controls.input}
                        type="number"
                        min={1}
                        value={form.capacity || ""}
                        onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    />
                </div>
                <label className={styles.checkRow}>
                    <input
                        type="checkbox"
                        checked={form.cancellationPolicy}
                        onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.checked })}
                    />
                    Huỷ miễn phí
                </label>
                <label className={styles.checkRow}>
                    <input type="checkbox" checked={form.allowPets} onChange={(e) => setForm({ ...form, allowPets: e.target.checked })} />
                    Cho phép thú cưng
                </label>
                <label className={styles.checkRow}>
                    <input
                        type="checkbox"
                        checked={form.allowSmoking}
                        onChange={(e) => setForm({ ...form, allowSmoking: e.target.checked })}
                    />
                    Cho phép hút thuốc
                </label>
                <div className={`${controls.field} ${styles.formGridFull}`}>
                    <label className={controls.label}>Tiện nghi</label>
                    <ChipPicker
                        items={amenities}
                        selectedIds={form.amenityIds}
                        onToggle={(id) => setForm({ ...form, amenityIds: toggle(form.amenityIds, id) })}
                    />
                </div>
                <div className={`${controls.field} ${styles.formGridFull}`}>
                    <label className={controls.label}>Hướng nhìn</label>
                    <ChipPicker
                        items={views}
                        selectedIds={form.viewIds}
                        onToggle={(id) => setForm({ ...form, viewIds: toggle(form.viewIds, id) })}
                    />
                </div>
            </div>
            {error && <p className={controls.error}>{error}</p>}
            <div className={styles.formActions}>
                <button type="button" className={controls.buttonGhost} onClick={onCancel}>
                    Huỷ
                </button>
                <button type="submit" className={controls.button} disabled={saving}>
                    {saving ? "Đang lưu..." : roomType ? "Lưu loại phòng" : "Tạo loại phòng"}
                </button>
            </div>
        </form>
    );
}
