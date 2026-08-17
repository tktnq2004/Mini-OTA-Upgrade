"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import {
    assignDiscountToRoom,
    createDiscount,
    deleteDiscount,
    listDiscounts,
    removeDiscountFromRoom,
    updateDiscount,
} from "@/lib/admin/resources";
import type { Discount, DiscountInput } from "@/lib/admin/types";

const EMPTY_FORM: DiscountInput = { discountPercent: 10, startDate: "", endDate: "" };

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<DiscountInput>(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [assignRoomId, setAssignRoomId] = useState("");
    const [assignDiscountId, setAssignDiscountId] = useState("");
    const [assignError, setAssignError] = useState("");
    const [assignSuccess, setAssignSuccess] = useState("");
    const [assigning, setAssigning] = useState(false);

    const load = () => {
        setLoading(true);
        listDiscounts()
            .then(setDiscounts)
            .catch((e) => setListError(e instanceof AdminApiError ? e.message : "Không tải được danh sách"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const resetForm = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const startEdit = (d: Discount) => {
        setEditingId(d.id);
        setForm({ discountPercent: d.discountPercent, startDate: d.startDate, endDate: d.endDate });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.discountPercent || !form.startDate || !form.endDate) {
            setFormError("Vui lòng nhập đủ % giảm, ngày bắt đầu và kết thúc");
            return;
        }
        setFormError("");
        setSaving(true);
        try {
            if (editingId) {
                await updateDiscount(editingId, form);
            } else {
                await createDiscount(form);
            }
            resetForm();
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(`Xoá mã giảm giá #${id}?`)) return;
        try {
            await deleteDiscount(id);
            load();
        } catch (e) {
            setListError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        setAssignError("");
        setAssignSuccess("");
        const roomId = Number(assignRoomId);
        const discountId = Number(assignDiscountId);
        if (!roomId || !discountId) {
            setAssignError("Nhập room ID và discount ID hợp lệ");
            return;
        }
        setAssigning(true);
        try {
            await assignDiscountToRoom(roomId, discountId);
            setAssignSuccess(`Đã gán khuyến mãi #${discountId} vào phòng #${roomId}`);
        } catch (e) {
            setAssignError(e instanceof AdminApiError ? e.message : "Gán thất bại");
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async () => {
        setAssignError("");
        setAssignSuccess("");
        const roomId = Number(assignRoomId);
        const discountId = Number(assignDiscountId);
        if (!roomId || !discountId) {
            setAssignError("Nhập room ID và discount ID hợp lệ");
            return;
        }
        try {
            await removeDiscountFromRoom(roomId, discountId);
            setAssignSuccess(`Đã gỡ khuyến mãi #${discountId} khỏi phòng #${roomId}`);
        } catch (e) {
            setAssignError(e instanceof AdminApiError ? e.message : "Gỡ thất bại");
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Khuyến mãi</h1>
                    <p className={styles.pageSubtitle}>Tạo mã giảm giá theo % và gán vào từng phòng cụ thể.</p>
                </div>
            </div>

            <div className={styles.stack}>
                <form className={styles.card} onSubmit={handleSubmit}>
                    <h2 className={styles.cardTitle}>{editingId ? `Sửa #${editingId}` : "Tạo khuyến mãi"}</h2>
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Phần trăm giảm (%)</label>
                            <input
                                className={controls.input}
                                type="number"
                                min={1}
                                max={100}
                                value={form.discountPercent}
                                onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
                            />
                        </div>
                        <div />
                        <div className={controls.field}>
                            <label className={controls.label}>Ngày bắt đầu</label>
                            <input
                                className={controls.input}
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Ngày kết thúc</label>
                            <input
                                className={controls.input}
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo"}
                        </button>
                        {editingId && (
                            <button type="button" className={controls.buttonGhost} onClick={resetForm}>
                                Huỷ
                            </button>
                        )}
                    </div>
                </form>

                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Gán / gỡ khuyến mãi cho phòng</h2>
                    <form className={styles.formGrid} onSubmit={handleAssign}>
                        <div className={controls.field}>
                            <label className={controls.label}>Room ID</label>
                            <input className={controls.input} value={assignRoomId} onChange={(e) => setAssignRoomId(e.target.value)} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Discount ID</label>
                            <input className={controls.input} value={assignDiscountId} onChange={(e) => setAssignDiscountId(e.target.value)} />
                        </div>
                        {assignError && <p className={`${controls.error} ${styles.formGridFull}`}>{assignError}</p>}
                        {assignSuccess && <p className={`${styles.success} ${styles.formGridFull}`}>{assignSuccess}</p>}
                        <div className={`${styles.formActions} ${styles.formGridFull}`} style={{ marginTop: 0 }}>
                            <button type="submit" className={controls.button} disabled={assigning}>
                                Gán
                            </button>
                            <button type="button" className={controls.buttonGhost} onClick={handleUnassign}>
                                Gỡ
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.panel}>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>% Giảm</th>
                                    <th>Bắt đầu</th>
                                    <th>Kết thúc</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map((d) => (
                                    <tr key={d.id}>
                                        <td>{d.id}</td>
                                        <td>{d.discountPercent}%</td>
                                        <td>{d.startDate}</td>
                                        <td>{d.endDate}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button type="button" className={styles.linkButton} onClick={() => startEdit(d)}>
                                                    Sửa
                                                </button>
                                                <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(d.id)}>
                                                    Xoá
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && discounts.length === 0 && <p className={styles.emptyState}>Chưa có khuyến mãi nào</p>}
                        {loading && <p className={styles.emptyState}>Đang tải...</p>}
                    </div>
                    {listError && <p className={controls.error} style={{ padding: "0 14px 14px" }}>{listError}</p>}
                </div>
            </div>
        </div>
    );
}
