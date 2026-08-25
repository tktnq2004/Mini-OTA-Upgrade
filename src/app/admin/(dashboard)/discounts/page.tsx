"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import {
    attachDiscountToRoom,
    createDiscount,
    deleteDiscount,
    detachDiscountFromRoom,
    listDiscounts,
    updateDiscount,
} from "@/lib/admin/resources";
import type { Discount, DiscountInput, DiscountUnit } from "@/lib/admin/types";

const EMPTY_FORM: DiscountInput = { discountValue: 10, discountUnit: "PERCENT" };

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<DiscountInput>(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [attachRoomId, setAttachRoomId] = useState("");
    const [attachDiscountId, setAttachDiscountId] = useState("");
    const [attachStart, setAttachStart] = useState("");
    const [attachEnd, setAttachEnd] = useState("");
    const [attachError, setAttachError] = useState("");
    const [attachSuccess, setAttachSuccess] = useState("");
    const [attaching, setAttaching] = useState(false);

    const [detachRoomId, setDetachRoomId] = useState("");
    const [detachDiscountId, setDetachDiscountId] = useState("");
    const [detachStatus, setDetachStatus] = useState("");

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
        setForm({ discountValue: d.discountValue, discountUnit: d.unit });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.discountValue || !form.discountUnit) {
            setFormError("Vui lòng nhập đủ giá trị và đơn vị giảm giá");
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

    const handleAttach = async (e: React.FormEvent) => {
        e.preventDefault();
        setAttachError("");
        setAttachSuccess("");
        const roomId = Number(attachRoomId);
        const discountId = Number(attachDiscountId);
        if (!roomId || !discountId || !attachStart || !attachEnd) {
            setAttachError("Nhập đủ room ID, discount ID, ngày bắt đầu và kết thúc");
            return;
        }
        setAttaching(true);
        try {
            await attachDiscountToRoom(roomId, discountId, attachStart, attachEnd);
            setAttachSuccess(`Đã gán khuyến mãi #${discountId} vào phòng #${roomId} (${attachStart} → ${attachEnd})`);
        } catch (e) {
            setAttachError(e instanceof AdminApiError ? e.message : "Gán thất bại");
        } finally {
            setAttaching(false);
        }
    };

    const handleDetach = async (e: React.FormEvent) => {
        e.preventDefault();
        setDetachStatus("");
        const roomId = Number(detachRoomId);
        const discountId = Number(detachDiscountId);
        if (!roomId || !discountId) {
            setDetachStatus("Nhập room ID và discount ID hợp lệ");
            return;
        }
        try {
            await detachDiscountFromRoom(roomId, [discountId]);
            setDetachStatus("Đã gọi API gỡ — nhưng backend hiện chưa thật sự xoá (xem ghi chú bên dưới).");
        } catch (e) {
            setDetachStatus(e instanceof AdminApiError ? e.message : "Gỡ thất bại");
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Khuyến mãi</h1>
                    <p className={styles.pageSubtitle}>
                        Discount chỉ là định nghĩa giá trị + đơn vị. Ngày áp dụng gắn riêng theo từng phòng bên dưới.
                    </p>
                </div>
            </div>

            <div className={styles.stack}>
                <form className={styles.card} onSubmit={handleSubmit}>
                    <h2 className={styles.cardTitle}>{editingId ? `Sửa #${editingId}` : "Tạo khuyến mãi"}</h2>
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Giá trị giảm</label>
                            <input
                                className={controls.input}
                                type="number"
                                min={0}
                                value={form.discountValue}
                                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Đơn vị</label>
                            <select
                                className={controls.select}
                                value={form.discountUnit}
                                onChange={(e) => setForm({ ...form, discountUnit: e.target.value as DiscountUnit })}
                            >
                                <option value="PERCENT">Phần trăm (0–100)</option>
                                <option value="FIXED_AMOUNT">Số tiền cố định</option>
                            </select>
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
                    <h2 className={styles.cardTitle}>Gán khuyến mãi vào phòng (kèm khung ngày)</h2>
                    <form className={styles.formGrid} onSubmit={handleAttach}>
                        <div className={controls.field}>
                            <label className={controls.label}>Room ID</label>
                            <input className={controls.input} value={attachRoomId} onChange={(e) => setAttachRoomId(e.target.value)} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Discount ID</label>
                            <input className={controls.input} value={attachDiscountId} onChange={(e) => setAttachDiscountId(e.target.value)} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Ngày bắt đầu</label>
                            <input
                                className={controls.input}
                                type="date"
                                value={attachStart}
                                onChange={(e) => setAttachStart(e.target.value)}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Ngày kết thúc</label>
                            <input className={controls.input} type="date" value={attachEnd} onChange={(e) => setAttachEnd(e.target.value)} />
                        </div>
                        {attachError && <p className={`${controls.error} ${styles.formGridFull}`}>{attachError}</p>}
                        {attachSuccess && <p className={`${styles.success} ${styles.formGridFull}`}>{attachSuccess}</p>}
                        <div className={`${styles.formActions} ${styles.formGridFull}`} style={{ marginTop: 0 }}>
                            <button type="submit" className={controls.button} disabled={attaching}>
                                {attaching ? "Đang gán..." : "Gán"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Gỡ khuyến mãi khỏi phòng</h2>
                    <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: -6 }}>
                        Backend hiện có bug: endpoint gỡ (DELETE /discounts) xác thực dữ liệu nhưng KHÔNG thật sự xoá liên
                        kết (logic xoá bị comment trong DiscountService). Bấm nút này sẽ không có tác dụng cho tới khi bên
                        backend sửa.
                    </p>
                    <form className={styles.formGrid} onSubmit={handleDetach}>
                        <div className={controls.field}>
                            <label className={controls.label}>Room ID</label>
                            <input className={controls.input} value={detachRoomId} onChange={(e) => setDetachRoomId(e.target.value)} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Discount ID</label>
                            <input className={controls.input} value={detachDiscountId} onChange={(e) => setDetachDiscountId(e.target.value)} />
                        </div>
                        {detachStatus && <p className={`${styles.pageSubtitle} ${styles.formGridFull}`}>{detachStatus}</p>}
                        <div className={`${styles.formActions} ${styles.formGridFull}`} style={{ marginTop: 0 }}>
                            <button type="submit" className={controls.buttonGhost}>
                                Gỡ (chưa hoạt động)
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
                                    <th>Giá trị</th>
                                    <th>Đơn vị</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map((d) => (
                                    <tr key={d.id}>
                                        <td>{d.id}</td>
                                        <td>{d.discountValue}</td>
                                        <td>{d.unit === "PERCENT" ? "%" : "Số tiền cố định"}</td>
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
