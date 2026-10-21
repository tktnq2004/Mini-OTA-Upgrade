"use client";

import { useEffect, useState } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { AdminApiError } from "@/lib/admin/apiClient";
import {
    createDiscount,
    deleteDiscount,
    getHotel,
    listDiscounts,
    listHotels,
    updateDiscount,
} from "@/lib/admin/resources";
import type { Discount, DiscountInput, Hotel, Room } from "@/lib/admin/types";
import { todayIso } from "@/lib/searchFilters";
import { EMPTY_FORM, toInput, validate } from "./discountRules";
import DiscountForm from "./DiscountForm";
import DiscountTable from "./DiscountTable";
import page from "./discounts.module.css";

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

    const roomsLabel = (d: Discount) => {
        if (d.roomIds.length === 0) return "Tất cả phòng";
        const rooms = roomsByHotel[d.hotelId];
        if (!rooms) return `${d.roomIds.length} phòng`;
        return d.roomIds.map((id) => rooms.find((r) => r.id === id)?.name ?? `#${id}`).join(", ");
    };

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
                // Backend chưa lên API mới (docs/DISCOUNT_API.md) vẫn trả mảng
                // thường, không có result/meta — báo lỗi thay vì sập cả trang.
                if (!Array.isArray(res?.result)) throw new Error("Backend chưa hỗ trợ API khuyến mãi mới (danh sách phân trang)");
                setDiscounts(res.result);
                setTotalPages(res.meta?.totalPages || 1);
            })
            .catch((e) => setListError(e instanceof Error && e.message ? e.message : "Không tải được danh sách"))
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const message = validate(form, {
            scopeAll,
            isEditing: editingId !== null,
            needHotel: isSuperAdmin && editingId === null,
            today,
        });
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
                <DiscountForm
                    form={form}
                    onChange={setForm}
                    scopeAll={scopeAll}
                    onScopeAllChange={setScopeAll}
                    editingId={editingId}
                    canPickHotel={isSuperAdmin}
                    hotels={hotels}
                    onHotelChange={changeFormHotel}
                    rooms={form.hotelId ? roomsByHotel[form.hotelId] : undefined}
                    error={formError}
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                />
            )}

            <DiscountTable
                discounts={discounts}
                today={today}
                loading={loading}
                error={listError}
                showHotel={isSuperAdmin}
                hotelName={hotelName}
                roomsLabel={roomsLabel}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={startEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                pageNo={pageNo}
                totalPages={totalPages}
                onPageChange={setPageNo}
            />
        </div>
    );
}
