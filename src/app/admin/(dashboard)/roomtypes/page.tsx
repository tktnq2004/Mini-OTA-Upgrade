"use client";

import { useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createRoomType, deleteRoomType, getRoomType, updateRoomType } from "@/lib/admin/resources";
import type { RoomType } from "@/lib/admin/types";

export default function RoomTypesPage() {
    const [lookupId, setLookupId] = useState("");
    const [found, setFound] = useState<RoomType | null>(null);
    const [lookupError, setLookupError] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);

    const [createName, setCreateName] = useState("");
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState<RoomType | null>(null);
    const [creating, setCreating] = useState(false);

    const [editName, setEditName] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLookupError("");
        setFound(null);
        const id = Number(lookupId);
        if (!id) {
            setLookupError("Nhập ID hợp lệ");
            return;
        }
        setLookupLoading(true);
        try {
            const rt = await getRoomType(id);
            setFound(rt);
            setEditName(rt.roomTypeName);
        } catch (e) {
            setLookupError(e instanceof AdminApiError ? e.message : "Không tìm thấy loại phòng này");
        } finally {
            setLookupLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError("");
        setCreateSuccess(null);
        if (!createName.trim()) {
            setCreateError("Nhập tên loại phòng");
            return;
        }
        setCreating(true);
        try {
            const rt = await createRoomType(createName.trim());
            setCreateSuccess(rt);
            setCreateName("");
        } catch (e) {
            setCreateError(e instanceof AdminApiError ? e.message : "Tạo thất bại");
        } finally {
            setCreating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!found || !editName.trim()) return;
        setSavingEdit(true);
        try {
            const updated = await updateRoomType(found.id, editName.trim());
            setFound(updated);
        } catch (e) {
            setLookupError(e instanceof AdminApiError ? e.message : "Cập nhật thất bại");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async () => {
        if (!found) return;
        if (!confirm(`Xoá loại phòng #${found.id}?`)) return;
        try {
            await deleteRoomType(found.id);
            setFound(null);
            setLookupId("");
        } catch (e) {
            setLookupError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Loại phòng</h1>
                    <p className={styles.pageSubtitle}>
                        Backend chưa có API liệt kê tất cả loại phòng — tra theo ID để xem/sửa/xoá. ID thường thấy khi tạo
                        phòng mới hoặc do backend cung cấp riêng.
                    </p>
                </div>
            </div>

            <div className={styles.formGrid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Tạo loại phòng mới</h2>
                    <form onSubmit={handleCreate} className={styles.stack}>
                        <div className={controls.field}>
                            <label className={controls.label}>Tên loại phòng</label>
                            <input
                                className={controls.input}
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder="Deluxe, Suite, Standard..."
                            />
                        </div>
                        {createError && <p className={controls.error}>{createError}</p>}
                        {createSuccess && (
                            <p className={styles.success}>Đã tạo #{createSuccess.id} — {createSuccess.roomTypeName}</p>
                        )}
                        <button type="submit" className={controls.button} disabled={creating}>
                            {creating ? "Đang tạo..." : "Tạo"}
                        </button>
                    </form>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Tra cứu theo ID</h2>
                    <form onSubmit={handleLookup} className={styles.stack}>
                        <div className={controls.field}>
                            <label className={controls.label}>Room type ID</label>
                            <input
                                className={controls.input}
                                type="number"
                                value={lookupId}
                                onChange={(e) => setLookupId(e.target.value)}
                            />
                        </div>
                        {lookupError && <p className={controls.error}>{lookupError}</p>}
                        <button type="submit" className={controls.buttonGhost} disabled={lookupLoading}>
                            {lookupLoading ? "Đang tìm..." : "Tìm"}
                        </button>
                    </form>

                    {found && (
                        <div className={styles.stack} style={{ marginTop: 16 }}>
                            <div className={controls.field}>
                                <label className={controls.label}>Tên loại phòng (#{found.id})</label>
                                <input className={controls.input} value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className={styles.formActions}>
                                <button type="button" className={controls.button} onClick={handleSaveEdit} disabled={savingEdit}>
                                    {savingEdit ? "Đang lưu..." : "Cập nhật"}
                                </button>
                                <button type="button" className={styles.linkButtonDanger} onClick={handleDelete}>
                                    Xoá
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
