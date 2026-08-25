"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createRole, deleteRole, derivePermissionCatalog, listRoles, replaceRolePermissions } from "@/lib/admin/resources";
import type { Permission, Role } from "@/lib/admin/types";

const EMPTY_FORM = { roleName: "", description: "", level: 2, permissionIds: [] as number[] };

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [editRoleId, setEditRoleId] = useState<number | null>(null);
    const [editPermissionIds, setEditPermissionIds] = useState<number[]>([]);
    const [editError, setEditError] = useState("");
    const [editSaving, setEditSaving] = useState(false);

    const load = () => {
        setLoading(true);
        listRoles()
            .then(setRoles)
            .catch((e) => setListError(e instanceof AdminApiError ? e.message : "Không tải được danh sách role"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const permissionCatalog: Permission[] = derivePermissionCatalog(roles);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.roleName.trim() || !form.level) {
            setFormError("Vui lòng nhập tên role và level");
            return;
        }
        setFormError("");
        setSaving(true);
        try {
            await createRole(form);
            setForm(EMPTY_FORM);
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : "Tạo role thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(`Xoá role #${id}?`)) return;
        try {
            await deleteRole(id);
            load();
        } catch (e) {
            setListError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    const startEditPermissions = (role: Role) => {
        setEditRoleId(role.id);
        setEditPermissionIds(role.permissions.map((p) => p.id));
        setEditError("");
    };

    const handleSavePermissions = async () => {
        if (!editRoleId) return;
        setEditError("");
        setEditSaving(true);
        try {
            await replaceRolePermissions(editRoleId, editPermissionIds);
            setEditRoleId(null);
            load();
        } catch (e) {
            setEditError(e instanceof AdminApiError ? e.message : "Cập nhật quyền thất bại");
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Phân quyền (Roles)</h1>
                    <p className={styles.pageSubtitle}>
                        Đây là nơi quyết định quyền THẬT của tài khoản (khác với field &quot;Vai trò&quot; ở trang Người
                        dùng, chỉ để hiển thị). Danh sách quyền bên dưới lấy gián tiếp từ các role đang có — backend chưa
                        có API liệt kê toàn bộ quyền (GET /permissions đang là stub luôn trả null). Không có chức năng
                        &quot;sửa tên/level role&quot; vì endpoint đó bên backend cũng đang là stub.
                    </p>
                </div>
            </div>

            <div className={styles.stack}>
                <form className={styles.card} onSubmit={handleCreate}>
                    <h2 className={styles.cardTitle}>Tạo role mới</h2>
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Tên role</label>
                            <input
                                className={controls.input}
                                value={form.roleName}
                                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                                placeholder="ROLE_STAFF"
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Level (số nhỏ hơn = cấp cao hơn)</label>
                            <input
                                className={controls.input}
                                type="number"
                                min={1}
                                value={form.level}
                                onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                            />
                            <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>
                                Tài khoản của bạn phải có level nhỏ hơn level nhập ở đây, nếu không backend sẽ từ chối.
                            </span>
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Mô tả</label>
                            <input
                                className={controls.input}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Quyền</label>
                            <select
                                className={controls.select}
                                multiple
                                style={{ minHeight: 140 }}
                                value={form.permissionIds.map(String)}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        permissionIds: Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
                                    })
                                }
                            >
                                {permissionCatalog.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        [{p.module}] {p.permissionName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang tạo..." : "Tạo role"}
                        </button>
                    </div>
                </form>

                <div className={styles.panel}>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên role</th>
                                    <th>Level</th>
                                    <th>Mô tả</th>
                                    <th>Quyền</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.id}</td>
                                        <td>{r.roleName}</td>
                                        <td>{r.level}</td>
                                        <td>{r.description}</td>
                                        <td>{r.permissions.length} quyền</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button type="button" className={styles.linkButton} onClick={() => startEditPermissions(r)}>
                                                    Sửa quyền
                                                </button>
                                                <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(r.id)}>
                                                    Xoá
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && roles.length === 0 && <p className={styles.emptyState}>Chưa có role nào</p>}
                        {loading && <p className={styles.emptyState}>Đang tải...</p>}
                    </div>
                    {listError && <p className={controls.error} style={{ padding: "0 14px 14px" }}>{listError}</p>}
                </div>

                {editRoleId && (
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Sửa quyền cho role #{editRoleId} (thay thế toàn bộ)</h2>
                        <select
                            className={controls.select}
                            multiple
                            style={{ minHeight: 160, width: "100%" }}
                            value={editPermissionIds.map(String)}
                            onChange={(e) => setEditPermissionIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
                        >
                            {permissionCatalog.map((p) => (
                                <option key={p.id} value={p.id}>
                                    [{p.module}] {p.permissionName}
                                </option>
                            ))}
                        </select>
                        {editError && <p className={controls.error}>{editError}</p>}
                        <div className={styles.formActions}>
                            <button type="button" className={controls.button} onClick={handleSavePermissions} disabled={editSaving}>
                                {editSaving ? "Đang lưu..." : "Lưu bộ quyền"}
                            </button>
                            <button type="button" className={controls.buttonGhost} onClick={() => setEditRoleId(null)}>
                                Huỷ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
