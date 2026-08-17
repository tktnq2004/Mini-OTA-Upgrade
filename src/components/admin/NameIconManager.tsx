"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "./adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";

interface NamedIconItem {
    id: number;
    name: string;
    icon: string;
}

interface NameIconManagerProps {
    title: string;
    subtitle: string;
    nameLabel?: string;
    list: () => Promise<NamedIconItem[]>;
    create: (name: string, icon: string) => Promise<NamedIconItem>;
    update: (id: number, name: string, icon: string) => Promise<NamedIconItem>;
    remove: (id: number) => Promise<void>;
}

export default function NameIconManager({ title, subtitle, nameLabel = "Tên", list, create, update, remove }: NameIconManagerProps) {
    const [items, setItems] = useState<NamedIconItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("");
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        list()
            .then(setItems)
            .catch((e) => setError(e instanceof AdminApiError ? e.message : "Không tải được danh sách"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setIcon("");
    };

    const startEdit = (item: NamedIconItem) => {
        setEditingId(item.id);
        setName(item.name);
        setIcon(item.icon);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !icon.trim()) {
            setError("Vui lòng nhập đủ tên và icon");
            return;
        }
        setError("");
        setSaving(true);
        try {
            if (editingId) {
                await update(editingId, name.trim(), icon.trim());
            } else {
                await create(name.trim(), icon.trim());
            }
            resetForm();
            load();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Xoá mục này?")) return;
        try {
            await remove(id);
            load();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>{title}</h1>
                    <p className={styles.pageSubtitle}>{subtitle}</p>
                </div>
            </div>

            <div className={styles.stack}>
                <form className={styles.card} onSubmit={handleSubmit}>
                    <h2 className={styles.cardTitle}>{editingId ? `Sửa #${editingId}` : "Thêm mới"}</h2>
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>{nameLabel}</label>
                            <input className={controls.input} value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Icon (tên/slug icon)</label>
                            <input className={controls.input} value={icon} onChange={(e) => setIcon(e.target.value)} />
                        </div>
                    </div>
                    {error && <p className={controls.error}>{error}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm"}
                        </button>
                        {editingId && (
                            <button type="button" className={controls.buttonGhost} onClick={resetForm}>
                                Huỷ
                            </button>
                        )}
                    </div>
                </form>

                <div className={styles.panel}>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{nameLabel}</th>
                                    <th>Icon</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>{item.name}</td>
                                        <td>{item.icon}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button type="button" className={styles.linkButton} onClick={() => startEdit(item)}>
                                                    Sửa
                                                </button>
                                                <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(item.id)}>
                                                    Xoá
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && items.length === 0 && <p className={styles.emptyState}>Chưa có dữ liệu</p>}
                        {loading && <p className={styles.emptyState}>Đang tải...</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
