"use client";

import { useEffect, useRef, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createRole, deleteRole, derivePermissionCatalog, listRoles, replaceRolePermissions } from "@/lib/admin/resources";
import type { Permission, Role } from "@/lib/admin/types";

const EMPTY_FORM = { roleName: "", description: "", level: 2, permissionIds: [] as number[] };

interface PermissionCheckboxGridProps {
    catalog: Permission[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}

function PermissionCheckboxGrid({ catalog, selectedIds, onChange }: PermissionCheckboxGridProps) {
    const selected = new Set(selectedIds);
    const modules = Array.from(new Set(catalog.map((p) => p.module))).sort();

    const toggle = (id: number, checked: boolean) => {
        const next = new Set(selected);
        if (checked) next.add(id);
        else next.delete(id);
        onChange(Array.from(next));
    };

    const toggleModule = (module: string, checked: boolean) => {
        const idsInModule = catalog.filter((p) => p.module === module).map((p) => p.id);
        const next = new Set(selected);
        for (const id of idsInModule) {
            if (checked) next.add(id);
            else next.delete(id);
        }
        onChange(Array.from(next));
    };

    return (
        <div className={styles.stack}>
            {modules.map((module) => {
                const idsInModule = catalog.filter((p) => p.module === module).map((p) => p.id);
                const allSelected = idsInModule.length > 0 && idsInModule.every((id) => selected.has(id));
                return (
                    <div key={module}>
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--color-text)",
                                background: "var(--color-inset)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "6px 10px",
                                marginBottom: 8,
                                cursor: "pointer",
                            }}
                        >
                            <input type="checkbox" checked={allSelected} onChange={(e) => toggleModule(module, e.target.checked)} />
                            {module} — chọn tất cả
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                            {catalog
                                .filter((p) => p.module === module)
                                .map((p) => (
                                    <label key={p.id} className={styles.checkRow}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(p.id)}
                                            onChange={(e) => toggle(p.id, e.target.checked)}
                                        />
                                        {p.permissionName}
                                    </label>
                                ))}
                        </div>
                    </div>
                );
            })}
            {catalog.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>Chưa có quyền nào để chọn.</span>
            )}
        </div>
    );
}

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    // null = form đang ở chế độ "Tạo role mới"; có giá trị = đang sửa quyền
    // của role đó (tái dùng cùng 1 form thay vì tạo form riêng cho Sửa).
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const load = () => {
        setLoading(true);
        listRoles()
            .then(setRoles)
            .catch((e) => setListError(e instanceof AdminApiError ? e.message : "Không tải được danh sách role"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const permissionCatalog: Permission[] = derivePermissionCatalog(roles);

    const resetForm = () => {
        setEditingRoleId(null);
        setForm(EMPTY_FORM);
        setFormError("");
    };

    const startEditPermissions = (role: Role) => {
        setEditingRoleId(role.id);
        setForm({
            roleName: role.roleName,
            description: role.description ?? "",
            level: role.level,
            permissionIds: role.permissions.map((p) => p.id),
        });
        setFormError("");
        // Form nằm ở đầu trang, bảng role ở dưới — cuộn lên để thấy form vừa
        // đổi sang nội dung của role được chọn.
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSaving(true);
        try {
            if (editingRoleId) {
                // roleName/description/level không sửa được (PATCH /roles/{id}
                // bên backend là stub luôn trả null) — chỉ bộ quyền là lưu thật.
                await replaceRolePermissions(editingRoleId, form.permissionIds);
            } else {
                if (!form.roleName.trim() || !form.level) {
                    setFormError("Vui lòng nhập tên role và level");
                    setSaving(false);
                    return;
                }
                await createRole(form);
            }
            resetForm();
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : editingRoleId ? "Cập nhật quyền thất bại" : "Tạo role thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(`Xoá role #${id}?`)) return;
        try {
            await deleteRole(id);
            if (editingRoleId === id) resetForm();
            load();
        } catch (e) {
            setListError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
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
                <form ref={formRef} className={styles.card} onSubmit={handleSubmit}>
                    <h2 className={styles.cardTitle}>{editingRoleId ? `Sửa quyền — role #${editingRoleId}` : "Tạo role mới"}</h2>
                    {editingRoleId && (
                        <p style={{ fontSize: 11.5, color: "var(--color-text-faint)", marginTop: -6, marginBottom: 12 }}>
                            Tên/level/mô tả không sửa được (endpoint <code>PATCH /roles/&#123;id&#125;</code> bên backend
                            đang là stub) — chỉ bộ quyền bên dưới là lưu thật được.
                        </p>
                    )}
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Tên role</label>
                            <input
                                className={controls.input}
                                value={form.roleName}
                                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                                placeholder="ROLE_STAFF"
                                disabled={!!editingRoleId}
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
                                disabled={!!editingRoleId}
                            />
                            {!editingRoleId && (
                                <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>
                                    Tài khoản của bạn phải có level nhỏ hơn level nhập ở đây, nếu không backend sẽ từ chối.
                                </span>
                            )}
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Mô tả</label>
                            <input
                                className={controls.input}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                disabled={!!editingRoleId}
                            />
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Quyền</label>
                            <PermissionCheckboxGrid
                                catalog={permissionCatalog}
                                selectedIds={form.permissionIds}
                                onChange={(permissionIds) => setForm({ ...form, permissionIds })}
                            />
                        </div>
                    </div>
                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : editingRoleId ? "Lưu bộ quyền" : "Tạo role"}
                        </button>
                        <button
                            type="button"
                            className={controls.buttonGhost}
                            onClick={() => setForm({ ...form, permissionIds: permissionCatalog.map((p) => p.id) })}
                        >
                            Chọn tất cả quyền
                        </button>
                        {form.permissionIds.length > 0 && (
                            <button type="button" className={controls.buttonGhost} onClick={() => setForm({ ...form, permissionIds: [] })}>
                                Bỏ chọn tất cả
                            </button>
                        )}
                        {editingRoleId && (
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
            </div>
        </div>
    );
}
