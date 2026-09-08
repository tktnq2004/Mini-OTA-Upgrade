"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createUser, deleteUser, listHotels, listRoles, listUsers, updateUser } from "@/lib/admin/resources";
import type { AppUser, Hotel, Role, UserInput } from "@/lib/admin/types";

const EMPTY_FORM: UserInput = { fullName: "", username: "", email: "", password: "", phone: "", hotelId: null, roleId: null };

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
    // Snapshot lúc mở form Sửa — dùng để biết field nào THẬT SỰ đổi so với
    // lúc mở (kể cả role), tránh gọi API với body y hệt cũ (xem handleSubmit).
    const [originalForm, setOriginalForm] = useState<UserInput | null>(null);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [roles, setRoles] = useState<Role[]>([]);
    // Danh sách khách sạn cho dropdown "Khách sạn phụ trách" — lấy 1 trang
    // lớn (size:100) vì listHotels vốn phân trang mà dropdown cần thấy hết;
    // đủ dùng cho quy mô demo hiện tại, cần đổi cách lấy nếu số khách sạn
    // vượt quá 100.
    const [hotels, setHotels] = useState<Hotel[]>([]);

    useEffect(() => {
        listRoles()
            .then(setRoles)
            .catch(() => setRoles([]));
        listHotels({ size: 100 })
            .then((res) => setHotels(res.result))
            .catch(() => setHotels([]));
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
        setOriginalForm(null);
        setFormError("");
        setShowForm(true);
    };

    const openEdit = (u: AppUser) => {
        setIsEditingUser(true);
        setEditingId(u.id);
        // fullName/username/phone có thể null (dữ liệu cũ/seed thiếu) —
        // input controlled không chấp nhận value=null, phải đổi về "".
        // hotelId để null ("giữ nguyên") chứ không prefill hotel hiện tại —
        // cùng lý do roleId prefill ĐÚNG role hiện tại (khác hotelId): dropdown
        // role cần hiện sẵn lựa chọn hiện tại để sửa nhanh, còn hotelId thì
        // không (xem chú thích ở dropdown "Khách sạn phụ trách" bên dưới).
        const initialForm: UserInput = {
            fullName: u.fullName ?? "",
            username: u.username ?? "",
            email: u.email,
            password: "",
            phone: u.phone ?? "",
            hotelId: null,
            roleId: u.roleId ?? null,
        };
        setForm(initialForm);
        setOriginalForm(initialForm);
        setFormError("");
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Backend (PUT /admin/users/{id}, UserService.update_All) để trống
        // password lúc Sửa = giữ nguyên. Password chỉ bắt buộc lúc TẠO mới.
        if (!form.fullName || !form.username || !form.email || !form.phone || (!isEditingUser && !form.password)) {
            setFormError("Vui lòng nhập đủ thông tin bắt buộc" + (isEditingUser ? "" : ", kể cả mật khẩu"));
            return;
        }
        if (isEditingUser && !editingId) {
            setFormError("Thiếu User ID.");
            return;
        }
        setFormError("");
        setSaving(true);
        try {
            if (isEditingUser && editingId) {
                // Role giờ là 1 field trong CHÍNH form này (không còn khối/nút
                // riêng) — "Cập nhật" gửi 1 request PUT duy nhất, backend tự áp
                // dụng field nào thật sự đổi (kể cả role, xem UserInput.roleId).
                // Chỉ cần chặn trước request rỗng (không đổi gì) để tránh lỗi
                // "Nothing change" từ backend.
                const changed =
                    !originalForm ||
                    form.fullName !== originalForm.fullName ||
                    form.username !== originalForm.username ||
                    form.email !== originalForm.email ||
                    form.phone !== originalForm.phone ||
                    form.password !== "" ||
                    form.hotelId !== null ||
                    (form.roleId !== null && form.roleId !== originalForm.roleId);
                if (!changed) {
                    setFormError("Không có gì để cập nhật.");
                    return;
                }
                await updateUser(editingId, form);
            } else {
                // POST /users public/không xác thực nên không nhận roleId lúc
                // tạo (xem UserInput.roleId) — nếu có chọn role, gọi thêm 1
                // request PUT ngay sau đó bằng chính id vừa tạo. Với người
                // dùng vẫn là 1 thao tác — bấm "Tạo" 1 lần.
                const created = await createUser(form);
                if (form.roleId !== null && created.id) {
                    try {
                        await updateUser(created.id, form);
                    } catch (roleErr) {
                        setShowForm(false);
                        load();
                        setListError(
                            `Đã tạo user nhưng gán role thất bại: ${
                                roleErr instanceof AdminApiError ? roleErr.message : "Lỗi không xác định"
                            }`
                        );
                        return;
                    }
                }
            }
            setShowForm(false);
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const hotelName = (hotelId?: number | null) =>
        hotelId ? (hotels.find((h) => h.id === hotelId)?.name ?? `#${hotelId}`) : "—";

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
                    <p className={styles.pageSubtitle}>Danh sách tài khoản trong hệ thống.</p>
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
                            <label className={controls.label}>{isEditingUser ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}</label>
                            <input
                                className={controls.input}
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Khách sạn phụ trách</label>
                            {/* hotelId = null -> customer (mặc định). hotelId = 0 (hotel "Hệ
                                thống" — sentinel chỉ dành cho admin gốc do StartupRunner sinh ra)
                                không xuất hiện ở đây vì backend đã lọc khỏi danh sách `hotels`
                                lẫn chặn gán qua API này. Lúc SỬA, để nguyên "— Giữ nguyên —"
                                nghĩa là GIỮ NGUYÊN hotel hiện tại (chưa hỗ trợ bỏ gán về customer
                                qua form này). */}
                            <select
                                className={controls.select}
                                value={form.hotelId ?? ""}
                                onChange={(e) => setForm({ ...form, hotelId: e.target.value ? Number(e.target.value) : null })}
                            >
                                <option value="">{isEditingUser ? "— Giữ nguyên —" : "— Không gán khách sạn (customer) —"}</option>
                                {hotels.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Vai trò</label>
                            {/* Gộp thẳng vào form user (không còn khối/nút "Gán vai trò" riêng
                                — trước đây bấm nhầm "Cập nhật" thay vì nút riêng đó làm role chọn
                                bị bỏ qua, còn request PUT thì báo lỗi "Nothing change" dù có ý
                                định đổi role thật). Lúc SỬA, dropdown prefill đúng role hiện tại
                                (khác hotelId — role cần thấy ngay giá trị đang có). Lúc TẠO, chọn
                                role ở đây thì FE tự gọi thêm 1 lần cập nhật ngay sau khi tạo xong
                                (POST /users public nên không nhận field này — xem
                                UserInput.roleId), vẫn chỉ 1 thao tác bấm "Tạo". */}
                            <select
                                className={controls.select}
                                value={form.roleId ?? ""}
                                onChange={(e) => setForm({ ...form, roleId: e.target.value ? Number(e.target.value) : null })}
                            >
                                <option value="">{isEditingUser ? "— Giữ nguyên —" : "— Chưa gán role —"}</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.roleName}
                                    </option>
                                ))}
                            </select>
                            {roles.length === 0 && (
                                <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>
                                    Chưa có role nào — tạo ở trang Phân quyền trước.
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
                                <th>Khách sạn</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td>{u.fullName}</td>
                                    <td>{u.email}</td>
                                    <td>{u.username}</td>
                                    <td>{u.phone}</td>
                                    <td>{u.roleName ?? "—"}</td>
                                    <td>{hotelName(u.hotelId)}</td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            <button type="button" className={styles.linkButton} onClick={() => openEdit(u)}>
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.linkButtonDanger}
                                                onClick={() => handleDelete(u.id)}
                                            >
                                                Xoá
                                            </button>
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
