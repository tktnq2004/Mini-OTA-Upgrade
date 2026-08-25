"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { assignUserRoles, createUser, deleteUser, listRoles, listUsers, updateUser } from "@/lib/admin/resources";
import type { AppUser, Role, UserInput } from "@/lib/admin/types";

const EMPTY_FORM: UserInput = { fullName: "", username: "", email: "", password: "", phone: "" };

export default function UsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
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
        setIsEditingUser(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setShowForm(true);
    };

    const openEdit = (u: AppUser) => {
        // Sửa lần trước: nếu u.id là null (bug backend — xem ghi chú dưới
        // bảng), ẩn hẳn nút Sửa. Hệ quả là khối "Gán role thật" (nằm trong
        // form Sửa) không bao giờ mở được với user có sẵn — không đúng ý,
        // giờ luôn cho mở form Sửa, chỉ khác là phải tự nhập ID khi backend
        // không trả được.
        setIsEditingUser(true);
        setEditingId(u.id);
        // fullName/username/phone có thể null (dữ liệu cũ/seed thiếu) —
        // input controlled không chấp nhận value=null, phải đổi về "".
        setForm({
            fullName: u.fullName ?? "",
            username: u.username ?? "",
            email: u.email,
            password: "",
            phone: u.phone ?? "",
        });
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
        // Bug backend đã xác nhận (PUT /users không có @Valid + UserService.update
        // ghi thẳng password không hash lại): để trống mật khẩu lúc Sửa sẽ GHI ĐÈ
        // password của user đó bằng chuỗi rỗng, không đăng nhập lại được nữa. Vì
        // vậy bắt buộc nhập mật khẩu ở CẢ Sửa lẫn Tạo, không có chuyện "để trống
        // nếu không đổi".
        if (!form.fullName || !form.username || !form.email || !form.phone || !form.password) {
            setFormError("Vui lòng nhập đủ thông tin bắt buộc, kể cả mật khẩu");
            return;
        }
        if (isEditingUser && !editingId) {
            setFormError("Backend không trả ID cho user này ở API danh sách — nhập User ID thủ công ở khối bên dưới trước.");
            return;
        }
        setFormError("");
        setSaving(true);
        try {
            if (isEditingUser && editingId) {
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
                        đơn lẻ thì đúng. Bấm &quot;Sửa&quot; vẫn mở được form (kể cả để gán role) — nếu ID bị thiếu, form
                        sẽ hỏi nhập tay.
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
                    <h2 className={styles.cardTitle}>
                        {isEditingUser ? `Sửa${editingId ? ` #${editingId}` : ""}` : "Thêm người dùng"}
                    </h2>
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
                            <label className={controls.label}>{isEditingUser ? "Mật khẩu mới (bắt buộc)" : "Mật khẩu"}</label>
                            <input
                                className={controls.input}
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
                            {isEditingUser && (
                                <span style={{ fontSize: 11.5, color: "var(--color-error)" }}>
                                    Bug backend: để trống ô này sẽ xoá mật khẩu cũ (ghi đè bằng chuỗi rỗng, không hash
                                    lại) — luôn phải nhập mật khẩu mới, kể cả khi chỉ muốn sửa thông tin khác.
                                </span>
                            )}
                        </div>
                    </div>
                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : isEditingUser ? "Cập nhật" : "Tạo"}
                        </button>
                        <button type="button" className={controls.buttonGhost} onClick={() => setShowForm(false)}>
                            Huỷ
                        </button>
                    </div>

                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--color-border-soft)" }}>
                        <label className={controls.label}>Vai trò</label>
                        {!isEditingUser ? (
                            <p style={{ fontSize: 12, color: "var(--color-text-faint)", marginTop: 6 }}>
                                Tạo user xong rồi mới gán được vai trò (cần ID thật) — sau khi tạo, bấm &quot;Sửa&quot; ở
                                user vừa tạo để gán.
                            </p>
                        ) : (
                            <>
                                {!editingId && (
                                    <div className={controls.field} style={{ margin: "6px 0 12px" }}>
                                        <label className={controls.label}>
                                            User ID (backend không trả ID cho user này ở API danh sách — nhập tay)
                                        </label>
                                        <input
                                            className={controls.input}
                                            type="number"
                                            placeholder="Nhập User ID"
                                            onChange={(e) => setEditingId(e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                )}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                                    {roles.map((r) => (
                                        <label key={r.id} className={styles.checkRow}>
                                            <input
                                                type="checkbox"
                                                checked={assignRoleIds.includes(r.id)}
                                                onChange={(e) =>
                                                    setAssignRoleIds((current) =>
                                                        e.target.checked
                                                            ? [...current, r.id]
                                                            : current.filter((id) => id !== r.id)
                                                    )
                                                }
                                            />
                                            {r.roleName}
                                        </label>
                                    ))}
                                    {roles.length === 0 && (
                                        <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>
                                            Chưa có role nào — tạo ở trang Phân quyền trước.
                                        </span>
                                    )}
                                </div>
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        type="button"
                                        className={controls.buttonGhost}
                                        onClick={handleAssignRoles}
                                        disabled={assigning || !editingId}
                                    >
                                        {assigning ? "Đang gán..." : "Gán vai trò (thay thế toàn bộ)"}
                                    </button>
                                </div>
                                {assignStatus && <p className={styles.pageSubtitle}>{assignStatus}</p>}
                            </>
                        )}
                    </div>
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
                                    <td>
                                        <div className={styles.rowActions}>
                                            <button type="button" className={styles.linkButton} onClick={() => openEdit(u)}>
                                                Sửa
                                            </button>
                                            {u.id ? (
                                                <button
                                                    type="button"
                                                    className={styles.linkButtonDanger}
                                                    onClick={() => handleDelete(u.id as number)}
                                                >
                                                    Xoá
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }} title="Backend trả id null ở API danh sách — nhập tay ID trong form Sửa nếu cần thao tác">
                                                    Xoá: cần nhập tay ID trong form Sửa
                                                </span>
                                            )}
                                        </div>
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
