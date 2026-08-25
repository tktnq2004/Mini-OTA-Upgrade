"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { assignUserRoles, createUser, deleteUser, listRoles, listUsers, updateUser } from "@/lib/admin/resources";
import type { AppUser, LegacyRole, Role, UserInput } from "@/lib/admin/types";

const EMPTY_FORM: UserInput = { fullName: "", username: "", email: "", password: "", phone: "", role: "CUSTOMER" };

export default function UsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<UserInput>(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [roles, setRoles] = useState<Role[]>([]);
    const [assignRoleIds, setAssignRoleIds] = useState<number[]>([]);
    const [assigning, setAssigning] = useState(false);
    const [assignStatus, setAssignStatus] = useState("");

    useEffect(() => {
        listRoles()
            .then(setRoles)
            .catch(() => setRoles([]));
    }, []);

    const load = () => {
        setLoading(true);
        listUsers({ page, size: 10, query })
            .then((res) => {
                setUsers(res.result);
                setTotalPages(res.meta.totalPages || 1);
            })
            .catch((e) => setListError(e instanceof AdminApiError ? e.message : "Không tải được danh sách"))
            .finally(() => setLoading(false));
    };

    useEffect(load, [page]); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        load();
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setShowForm(true);
    };

    const openEdit = (u: AppUser) => {
        setEditingId(u.id);
        setForm({ fullName: u.fullName, username: u.username, email: u.email, password: "", phone: u.phone, role: u.role });
        setFormError("");
        setAssignRoleIds([]);
        setAssignStatus("");
        setShowForm(true);
    };

    const handleAssignRoles = async () => {
        if (!editingId) return;
        setAssignStatus("");
        setAssigning(true);
        try {
            await assignUserRoles(editingId, assignRoleIds);
            setAssignStatus("Đã gán role — thay thế toàn bộ role cũ của user này (không cộng dồn).");
        } catch (e) {
            setAssignStatus(e instanceof AdminApiError ? e.message : "Gán role thất bại");
        } finally {
            setAssigning(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName || !form.username || !form.email || !form.phone || (!editingId && !form.password)) {
            setFormError("Vui lòng nhập đủ thông tin bắt buộc");
            return;
        }
        setFormError("");
        setSaving(true);
        try {
            if (editingId) {
                await updateUser(editingId, form);
            } else {
                await createUser(form);
            }
            setShowForm(false);
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Xoá người dùng này?")) return;
        try {
            await deleteUser(id);
            load();
        } catch (e) {
            setListError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Người dùng</h1>
                    <p className={styles.pageSubtitle}>
                        Danh sách tài khoản trong hệ thống. Lưu ý: backend hiện có bug — <code>GET /users</code> (API
                        danh sách) luôn trả <code>id: null</code> cho mọi user dù <code>GET /users/&#123;id&#125;</code>{" "}
                        đơn lẻ thì đúng, nên các user hiện có trong bảng dưới không sửa/xoá được từ đây.
                    </p>
                </div>
                <button type="button" className={controls.button} onClick={openCreate}>
                    Thêm người dùng
                </button>
            </div>

            <form className={styles.toolbar} onSubmit={handleSearchSubmit}>
                <input
                    className={`${controls.input} ${styles.searchInput}`}
                    placeholder="Tìm theo email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className={controls.buttonGhost}>
                    Tìm
                </button>
            </form>

            {showForm && (
                <form className={styles.card} onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
                    <h2 className={styles.cardTitle}>{editingId ? `Sửa #${editingId}` : "Thêm người dùng"}</h2>
                    <div className={styles.formGrid}>
                        <div className={controls.field}>
                            <label className={controls.label}>Họ tên</label>
                            <input className={controls.input} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Username</label>
                            <input className={controls.input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Email</label>
                            <input className={controls.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Số điện thoại</label>
                            <input className={controls.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>{editingId ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}</label>
                            <input
                                className={controls.input}
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Vai trò (chỉ để hiển thị, không cấp quyền)</label>
                            <select
                                className={controls.select}
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value as LegacyRole })}
                            >
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                    </div>
                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo"}
                        </button>
                        <button type="button" className={controls.buttonGhost} onClick={() => setShowForm(false)}>
                            Huỷ
                        </button>
                    </div>

                    {editingId && (
                        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--color-border-soft)" }}>
                            <label className={controls.label}>Gán role thật (quyết định quyền thật sự qua Role/Permission)</label>
                            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "flex-start" }}>
                                <select
                                    className={controls.select}
                                    multiple
                                    style={{ flex: 1 }}
                                    value={assignRoleIds.map(String)}
                                    onChange={(e) =>
                                        setAssignRoleIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))
                                    }
                                >
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.roleName}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" className={controls.buttonGhost} onClick={handleAssignRoles} disabled={assigning}>
                                    {assigning ? "Đang gán..." : "Gán"}
                                </button>
                            </div>
                            {assignStatus && <p className={styles.pageSubtitle}>{assignStatus}</p>}
                        </div>
                    )}
                </form>
            )}

            {listError && <p className={controls.error}>{listError}</p>}

            <div className={styles.panel}>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>Username</th>
                                <th>SĐT</th>
                                <th>Vai trò</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.email}>
                                    <td>{u.id ?? "— (lỗi BE)"}</td>
                                    <td>{u.fullName}</td>
                                    <td>{u.email}</td>
                                    <td>{u.username}</td>
                                    <td>{u.phone}</td>
                                    <td>{u.role}</td>
                                    <td>
                                        {u.id ? (
                                            <div className={styles.rowActions}>
                                                <button type="button" className={styles.linkButton} onClick={() => openEdit(u)}>
                                                    Sửa
                                                </button>
                                                <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(u.id)}>
                                                    Xoá
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>
                                                Không sửa/xoá được (backend trả id null ở API danh sách)
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && users.length === 0 && <p className={styles.emptyState}>Không có người dùng nào</p>}
                    {loading && <p className={styles.emptyState}>Đang tải...</p>}
                </div>
                <div className={styles.pagination}>
                    <button type="button" className={controls.buttonGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Trước
                    </button>
                    <span>
                        Trang {page}/{totalPages}
                    </span>
                    <button
                        type="button"
                        className={controls.buttonGhost}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Sau
                    </button>
                </div>
            </div>
        </div>
    );
}
