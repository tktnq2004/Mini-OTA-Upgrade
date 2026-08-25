"use client";

import { useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "./adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { deleteRoom, removeRoomAmenity, removeRoomView, updateRoom } from "@/lib/admin/resources";
import type { Amenity, Room, View } from "@/lib/admin/types";

interface RoomCardProps {
    room: Room;
    allAmenities: Amenity[];
    allViews: View[];
    onChanged: () => void;
}

export default function RoomCard({ room, allAmenities, allViews, onChanged }: RoomCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [form, setForm] = useState({
        name: room.name,
        price: room.price,
        capacity: room.capacity,
        thumbnail: room.thumbnail,
        description: room.description,
        allowSmoking: room.allowSmoking,
        allowPets: room.allowPets,
        cancellationPolicy: room.cancellationPolicy,
    });
    const [addAmenityIds, setAddAmenityIds] = useState<number[]>([]);
    const [addViewIds, setAddViewIds] = useState<number[]>([]);
    const [removeViewId, setRemoveViewId] = useState<number | "">("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const currentAmenityIds = new Set((room.amenities ?? []).map((a) => a.id));
    const availableAmenities = allAmenities.filter((a) => !currentAmenityIds.has(a.id));
    // Room.views bị @JsonIgnore bên backend — API không bao giờ trả lại
    // hướng nhìn hiện tại của phòng, nên không biết cái nào đã gán để lọc
    // ra danh sách "còn lại". Ô thêm hiển thị tất cả hướng nhìn, ô gỡ để
    // admin tự chọn theo trí nhớ.

    const handleSave = async () => {
        setError("");
        setSaving(true);
        try {
            await updateRoom({
                roomId: room.id,
                name: form.name,
                price: form.price,
                capacity: form.capacity,
                thumbnail: form.thumbnail,
                allowSmoking: form.allowSmoking,
                allowPets: form.allowPets,
                cancellationPolicy: form.cancellationPolicy,
                description: form.description,
                amenities_id: addAmenityIds,
                viewIds: addViewIds,
            });
            setAddAmenityIds([]);
            setAddViewIds([]);
            onChanged();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRoom = async () => {
        if (!confirm(`Xoá phòng "${room.name}"?`)) return;
        try {
            await deleteRoom(room.id);
            onChanged();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    const handleRemoveAmenity = async (amenityId: number) => {
        try {
            await removeRoomAmenity(room.id, amenityId);
            onChanged();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Gỡ tiện nghi thất bại");
        }
    };

    const handleRemoveView = async () => {
        if (removeViewId === "") return;
        try {
            await removeRoomView(room.id, removeViewId);
            setRemoveViewId("");
            onChanged();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Gỡ hướng nhìn thất bại");
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
                        {room.price.toLocaleString("vi-VN")} đ / đêm · {room.capacity} khách
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
                {(room.amenities ?? []).map((a) => (
                    <span key={a.id} className={styles.chip}>
                        {a.name}
                        <button type="button" className={styles.chipRemove} onClick={() => handleRemoveAmenity(a.id)}>
                            ×
                        </button>
                    </span>
                ))}
                {(room.amenities?.length ?? 0) === 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>Chưa có tiện nghi</span>
                )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-faint)", marginTop: 4 }}>
                Hướng nhìn hiện tại không hiển thị được (API backend ẩn field này) — bấm &quot;Sửa&quot; để thêm/gỡ.
            </div>

            {expanded && (
                <div className={styles.stack} style={{ marginTop: 14 }}>
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
                            <label className={controls.label}>Sức chứa</label>
                            <input
                                className={controls.input}
                                type="number"
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                            />
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
                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={form.allowSmoking}
                                onChange={(e) => setForm({ ...form, allowSmoking: e.target.checked })}
                            />
                            Cho phép hút thuốc
                        </label>
                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={form.allowPets}
                                onChange={(e) => setForm({ ...form, allowPets: e.target.checked })}
                            />
                            Cho phép thú cưng
                        </label>
                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={form.cancellationPolicy}
                                onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.checked })}
                            />
                            Có chính sách huỷ phòng
                        </label>
                    </div>

                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Thêm tiện nghi</label>
                            <select
                                className={controls.select}
                                multiple
                                value={addAmenityIds.map(String)}
                                onChange={(e) =>
                                    setAddAmenityIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))
                                }
                            >
                                {availableAmenities.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Thêm hướng nhìn</label>
                            <select
                                className={controls.select}
                                multiple
                                value={addViewIds.map(String)}
                                onChange={(e) => setAddViewIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
                            >
                                {allViews.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={controls.field}>
                        <label className={controls.label}>Gỡ hướng nhìn (chọn 1)</label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <select
                                className={controls.select}
                                style={{ flex: 1 }}
                                value={removeViewId}
                                onChange={(e) => setRemoveViewId(e.target.value ? Number(e.target.value) : "")}
                            >
                                <option value="">— chọn hướng nhìn —</option>
                                {allViews.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                            <button type="button" className={controls.buttonGhost} onClick={handleRemoveView} disabled={removeViewId === ""}>
                                Gỡ
                            </button>
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
        </div>
    );
}
