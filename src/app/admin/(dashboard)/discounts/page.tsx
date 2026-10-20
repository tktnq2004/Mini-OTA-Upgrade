"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import { AdminApiError } from "@/lib/admin/apiClient";
import {
    createDiscount,
    deleteDiscount,
    getHotel,
    listDiscounts,
    listHotels,
    updateDiscount,
} from "@/lib/admin/resources";
import type { Discount, DiscountInput, DiscountUnit, Hotel, Room } from "@/lib/admin/types";
import { nightReduction } from "@/lib/booking/discount";
import { formatDateVn, formatVnd } from "@/lib/format";
import { todayIso } from "@/lib/searchFilters";
import page from "./discounts.module.css";

const NAME_MAX = 50;

const EMPTY_FORM: DiscountInput = {
    hotelId: null,
    name: "",
    discountValue: 10,
    discountUnit: "PERCENT",
    startDate: "",
    endDate: "",
    roomIds: [],
    active: true,
};

type DiscountStatus = "running" | "upcoming" | "ended" | "paused";

const STATUS_LABEL: Record<DiscountStatus, string> = {
    running: "Đang chạy",
    upcoming: "Sắp diễn ra",
    ended: "Đã kết thúc",
    paused: "Tạm tắt",
};

const STATUS_CLASS: Record<DiscountStatus, string> = {
    running: page.statusRunning,
    upcoming: page.statusUpcoming,
    ended: page.statusEnded,
    paused: page.statusPaused,
};

function statusOf(d: Discount, today: string): DiscountStatus {
    if (!d.active) return "paused";
    if (d.endDate < today) return "ended";
    if (d.startDate > today) return "upcoming";
    return "running";
}

function toInput(d: Discount): DiscountInput {
    return {
        hotelId: d.hotelId,
        name: d.name,
        discountValue: d.discountValue,
        discountUnit: d.discountUnit,
        startDate: d.startDate,
        endDate: d.endDate,
        roomIds: d.roomIds,
        active: d.active,
    };
}

// Cùng quy tắc với backend (docs/DISCOUNT_API.md mục 3.6) — chặn sớm ở FE cho
// nhanh, backend vẫn kiểm lại và thông báo lỗi của backend được hiện nguyên văn.
function validate(form: DiscountInput, scopeAll: boolean, isEditing: boolean, needHotel: boolean): string | null {
    if (needHotel && !form.hotelId) return "Chọn khách sạn áp dụng";
    const name = form.name.trim();
    if (!name) return "Nhập tên tag khuyến mãi";
    if (name.length > NAME_MAX) return `Tên tag tối đa ${NAME_MAX} ký tự`;
    if (!form.discountValue || form.discountValue <= 0) return "Giá trị giảm phải lớn hơn 0";
    if (form.discountUnit === "PERCENT" && form.discountValue >= 100) return "Phần trăm giảm phải nhỏ hơn 100";
    if (form.discountUnit === "FIXED_AMOUNT" && !Number.isInteger(form.discountValue)) return "Số tiền giảm phải là số nguyên (VNĐ)";
    if (!form.startDate || !form.endDate) return "Chọn đủ đêm bắt đầu và đêm kết thúc";
    if (form.startDate > form.endDate) return "Đêm bắt đầu phải trước hoặc trùng đêm kết thúc";
    if (!isEditing && form.endDate < todayIso()) return "Đêm kết thúc không được ở quá khứ";
    if (!scopeAll && form.roomIds.length === 0) return "Chọn ít nhất 1 phòng, hoặc áp dụng cho tất cả phòng";
    return null;
}

export default function DiscountsPage() {
    const { ready, error: accessError, hotelId: myHotelId, isSuperAdmin, hasPermission } = useAdminAccess();
    const canCreate = hasPermission("DISCOUNT_CREATE");
    const canUpdate = hasPermission("DISCOUNT_UPDATE");
    const canDelete = hasPermission("DISCOUNT_DELETE");
    const today = todayIso();

    // ----- Khách sạn + phòng -----
    // Admin hệ thống: cần danh sách hotel cho bộ lọc + dropdown của form (lấy
    // 1 trang lớn giống trang Người dùng). Owner/staff: chỉ hotel của mình.
    const [hotels, setHotels] = useState<Hotel[]>([]);
    // Phòng theo từng hotel, tải lười khi mở form (GET /hotels/{id} có sẵn rooms).
    const [roomsByHotel, setRoomsByHotel] = useState<Record<number, Room[]>>({});

    const loadRooms = (hotelId: number) => {
        if (roomsByHotel[hotelId]) return;
        getHotel(hotelId)
            .then((h) => {
                setRoomsByHotel((prev) => ({ ...prev, [hotelId]: h.rooms ?? [] }));
                if (!isSuperAdmin) setHotels([h]);
            })
            .catch(() => setRoomsByHotel((prev) => ({ ...prev, [hotelId]: [] })));
    };

    useEffect(() => {
        if (!ready) return;
        if (isSuperAdmin) {
            listHotels({ size: 100 })
                .then((res) => setHotels(res.result))
                .catch(() => setHotels([]));
        } else if (myHotelId) {
            loadRooms(myHotelId);
        }
    }, [ready, isSuperAdmin, myHotelId]); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ tải 1 lần khi biết quyền

    const hotelName = (d: Pick<Discount, "hotelId" | "hotelName">) =>
        d.hotelName || hotels.find((h) => h.id === d.hotelId)?.name || `#${d.hotelId}`;

    // ----- Danh sách -----
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [pageNo, setPageNo] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState("");
    const [filterHotelId, setFilterHotelId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const load = () => {
        if (!ready) return;
        setLoading(true);
        setListError("");
        listDiscounts({ page: pageNo, size: 10, query, hotelId: isSuperAdmin ? filterHotelId : null })
            .then((res) => {
                setDiscounts(res.result);
                setTotalPages(res.meta.totalPages || 1);
            })
            .catch((e) => setListError(e instanceof AdminApiError ? e.message : "Không tải được danh sách"))
            .finally(() => setLoading(false));
    };

    useEffect(load, [ready, pageNo, filterHotelId]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- tải dữ liệu từ API, một external system

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPageNo(1);
        load();
    };

    // ----- Form tạo / sửa -----
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<DiscountInput>(EMPTY_FORM);
    const [scopeAll, setScopeAll] = useState(true);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const formRooms = form.hotelId ? roomsByHotel[form.hotelId] : undefined;

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setScopeAll(true);
        setFormError("");
    };

    const openCreate = () => {
        const hotelId = isSuperAdmin ? filterHotelId : (myHotelId ?? null);
        setEditingId(null);
        setForm({ ...EMPTY_FORM, hotelId, startDate: today, endDate: today });
        setScopeAll(true);
        setFormError("");
        setShowForm(true);
        if (hotelId) loadRooms(hotelId);
    };

    const startEdit = (d: Discount) => {
        setEditingId(d.id);
        setForm(toInput(d));
        setScopeAll(d.roomIds.length === 0);
        setFormError("");
        setShowForm(true);
        loadRooms(d.hotelId);
    };

    const changeFormHotel = (hotelId: number | null) => {
        // Đổi hotel thì danh sách phòng cũ không còn hợp lệ.
        setForm({ ...form, hotelId, roomIds: [] });
        if (hotelId) loadRooms(hotelId);
    };

    const toggleRoom = (roomId: number) => {
        const roomIds = form.roomIds.includes(roomId)
            ? form.roomIds.filter((id) => id !== roomId)
            : [...form.roomIds, roomId];
        setForm({ ...form, roomIds });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const message = validate(form, scopeAll, editingId !== null, isSuperAdmin && editingId === null);
        if (message) {
            setFormError(message);
            return;
        }
        setFormError("");
        setSaving(true);
        const body: DiscountInput = { ...form, name: form.name.trim(), roomIds: scopeAll ? [] : form.roomIds };
        try {
            if (editingId) {
                await updateDiscount(editingId, body);
            } else {
                await createDiscount(body);
            }
            closeForm();
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (d: Discount) => {
        try {
            await updateDiscount(d.id, { ...toInput(d), active: !d.active });
            load();
        } catch (e) {
            setListError(e instanceof AdminApiError ? e.message : "Cập nhật thất bại");
        }
    };

    const handleDelete = async (d: Discount) => {
        if (!confirm(`Xoá khuyến mãi "${d.name}"? Đơn đã đặt trước đó vẫn giữ nguyên giá đã giảm.`)) return;
        try {
            await deleteDiscount(d.id);
            load();
        } catch (e) {
            setListError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    const roomsLabel = (d: Discount) => {
        if (d.roomIds.length === 0) return "Tất cả phòng";
        const rooms = roomsByHotel[d.hotelId];
        if (!rooms) return `${d.roomIds.length} phòng`;
        return d.roomIds.map((id) => rooms.find((r) => r.id === id)?.name ?? `#${id}`).join(", ");
    };

    // Ví dụ giá sau giảm cho 1 phòng mẫu — phòng đầu tiên được chọn, không thì
    // phòng đầu tiên của hotel.
    const previewRoom =
        formRooms?.find((r) => (scopeAll ? true : form.roomIds.includes(r.id))) ?? null;
    const previewDiscount = { ...form, id: 0 };
    const previewReduction = previewRoom && form.discountValue > 0 ? nightReduction(previewRoom.price, previewDiscount) : 0;

    if (accessError) {
        return <p className={controls.error}>{accessError}</p>;
    }

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Khuyến mãi</h1>
                    <p className={styles.pageSubtitle}>
                        Tag giảm giá hiện trên phòng và được trừ thẳng vào tiền đặt phòng, tính theo từng đêm ở.
                    </p>
                </div>
                {canCreate && (
                    <button type="button" className={controls.button} onClick={openCreate} disabled={!ready}>
                        Tạo khuyến mãi
                    </button>
                )}
            </div>

            <form className={styles.toolbar} onSubmit={handleSearchSubmit}>
                <input
                    className={`${controls.input} ${styles.searchInput}`}
                    placeholder="Tìm theo tên tag..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className={controls.buttonGhost}>
                    Tìm
                </button>
                {ready &&
                    (isSuperAdmin ? (
                        <select
                            className={controls.select}
                            style={{ width: "auto" }}
                            value={filterHotelId ?? ""}
                            onChange={(e) => {
                                setFilterHotelId(e.target.value ? Number(e.target.value) : null);
                                setPageNo(1);
                            }}
                            aria-label="Lọc theo khách sạn"
                        >
                            <option value="">Tất cả khách sạn</option>
                            {hotels.map((h) => (
                                <option key={h.id} value={h.id}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className={page.scopeNote}>
                            Khách sạn: {hotels[0]?.name ?? (myHotelId ? `#${myHotelId}` : "—")}
                        </span>
                    ))}
            </form>

            {showForm && (
                <form className={styles.card} onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
                    <h2 className={styles.cardTitle}>{editingId ? `Sửa khuyến mãi #${editingId}` : "Tạo khuyến mãi"}</h2>
                    <div className={styles.formGrid}>
                        {isSuperAdmin && (
                            <div className={`${controls.field} ${styles.formGridFull}`}>
                                <label className={controls.label}>Khách sạn</label>
                                <select
                                    className={controls.select}
                                    value={form.hotelId ?? ""}
                                    disabled={editingId !== null}
                                    onChange={(e) => changeFormHotel(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">— Chọn khách sạn —</option>
                                    {hotels.map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {h.name}
                                        </option>
                                    ))}
                                </select>
                                {editingId !== null && <p className={page.hint}>Không đổi được khách sạn của khuyến mãi đã tạo.</p>}
                            </div>
                        )}

                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Tên tag (khách nhìn thấy)</label>
                            <input
                                className={controls.input}
                                maxLength={NAME_MAX}
                                placeholder="VD: Ưu đãi mùa thu"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label}>Giá trị giảm</label>
                            <input
                                className={controls.input}
                                type="number"
                                min={0}
                                step={form.discountUnit === "PERCENT" ? "any" : 1000}
                                value={form.discountValue || ""}
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
                                <option value="PERCENT">Phần trăm (%) mỗi đêm</option>
                                <option value="FIXED_AMOUNT">Số tiền (VNĐ) mỗi đêm</option>
                            </select>
                        </div>

                        <div className={controls.field}>
                            <label className={controls.label}>Từ đêm</label>
                            <input
                                className={controls.input}
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Đến đêm (bao gồm)</label>
                            <input
                                className={controls.input}
                                type="date"
                                min={form.startDate || undefined}
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            />
                            <p className={page.hint}>Đêm cuối cùng được giảm. Khách ở qua khoảng này chỉ được giảm các đêm nằm bên trong.</p>
                        </div>

                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Phòng áp dụng</label>
                            <div className={page.scopeOptions}>
                                <label className={styles.checkRow}>
                                    <input type="radio" checked={scopeAll} onChange={() => setScopeAll(true)} />
                                    Tất cả phòng của khách sạn (gồm cả phòng thêm sau)
                                </label>
                                <label className={styles.checkRow}>
                                    <input type="radio" checked={!scopeAll} onChange={() => setScopeAll(false)} />
                                    Chọn từng phòng
                                </label>
                            </div>
                            {!scopeAll &&
                                (!form.hotelId ? (
                                    <p className={styles.pickerEmpty}>Chọn khách sạn trước.</p>
                                ) : !formRooms ? (
                                    <p className={styles.pickerEmpty}>Đang tải phòng...</p>
                                ) : formRooms.length === 0 ? (
                                    <p className={styles.pickerEmpty}>Khách sạn này chưa có phòng nào.</p>
                                ) : (
                                    <div className={styles.pickerGrid}>
                                        {formRooms.map((r) => {
                                            const checked = form.roomIds.includes(r.id);
                                            const reduction = form.discountValue > 0 ? nightReduction(r.price, previewDiscount) : 0;
                                            return (
                                                <label key={r.id} className={checked ? styles.pickerChipActive : styles.pickerChip}>
                                                    <input type="checkbox" checked={checked} onChange={() => toggleRoom(r.id)} />
                                                    {r.name}
                                                    <span className={page.roomChipPrice}>
                                                        {reduction > 0 && <s>{formatVnd(r.price)}</s>}
                                                        {formatVnd(r.price - reduction)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ))}
                        </div>

                        <label className={`${styles.checkRow} ${styles.formGridFull}`}>
                            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                            Kích hoạt (bỏ chọn để tạm tắt — khách không thấy tag, không được giảm)
                        </label>
                    </div>

                    {previewRoom && form.discountValue > 0 && (
                        <div className={page.preview}>
                            Ví dụ: <strong>{previewRoom.name}</strong> {formatVnd(previewRoom.price)} →{" "}
                            <strong>{formatVnd(previewRoom.price - previewReduction)}</strong> mỗi đêm được giảm
                            {form.discountUnit === "FIXED_AMOUNT" && form.discountValue >= previewRoom.price &&
                                " (số tiền giảm ≥ giá phòng: đêm đó miễn phí)"}
                            .
                        </div>
                    )}

                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo"}
                        </button>
                        <button type="button" className={controls.buttonGhost} onClick={closeForm}>
                            Huỷ
                        </button>
                    </div>
                </form>
            )}

            <div className={styles.panel}>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tag</th>
                                {isSuperAdmin && <th>Khách sạn</th>}
                                <th>Thời gian (đêm)</th>
                                <th>Phòng áp dụng</th>
                                <th>Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {discounts.map((d) => {
                                const status = statusOf(d, today);
                                return (
                                    <tr key={d.id}>
                                        <td>
                                            <DiscountTag discount={d} formatPrice={formatVnd} />
                                        </td>
                                        {isSuperAdmin && <td>{hotelName(d)}</td>}
                                        <td className={page.dateCell}>
                                            {formatDateVn(d.startDate)} – {formatDateVn(d.endDate)}
                                        </td>
                                        <td className={page.roomsCell}>{roomsLabel(d)}</td>
                                        <td>
                                            <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
                                        </td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                {canUpdate && (
                                                    <button type="button" className={styles.linkButton} onClick={() => startEdit(d)}>
                                                        Sửa
                                                    </button>
                                                )}
                                                {canUpdate && status !== "ended" && (
                                                    <button type="button" className={styles.linkButton} onClick={() => handleToggleActive(d)}>
                                                        {d.active ? "Tắt" : "Bật"}
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(d)}>
                                                        Xoá
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!loading && discounts.length === 0 && <p className={styles.emptyState}>Chưa có khuyến mãi nào</p>}
                    {loading && <p className={styles.emptyState}>Đang tải...</p>}
                </div>
                {listError && <p className={controls.error} style={{ padding: "0 14px 14px" }}>{listError}</p>}
                <div className={styles.pagination}>
                    <button type="button" className={controls.buttonGhost} disabled={pageNo <= 1} onClick={() => setPageNo((p) => p - 1)}>
                        Trước
                    </button>
                    <span>
                        Trang {pageNo}/{totalPages}
                    </span>
                    <button
                        type="button"
                        className={controls.buttonGhost}
                        disabled={pageNo >= totalPages}
                        onClick={() => setPageNo((p) => p + 1)}
                    >
                        Sau
                    </button>
                </div>
            </div>
        </div>
    );
}
