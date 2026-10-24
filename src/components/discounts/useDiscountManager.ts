"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createDiscount, deleteDiscount, getHotel, listDiscounts, listHotels, updateDiscount } from "@/lib/admin/resources";
import type { Discount, DiscountInput, Hotel, Room } from "@/lib/admin/types";
import { todayIso } from "@/lib/searchFilters";
import { EMPTY_FORM, toInput, validate } from "./discountRules";

const PAGE_SIZE = 10;

// Toàn bộ trạng thái + thao tác của trang quản lý khuyến mãi, dùng chung cho /admin
// (admin hệ thống: mọi hotel, có lọc theo hotel) và /partner (owner/staff: chỉ hotel
// của mình — backend cũng tự ép về hotel người gọi). Mỗi cổng chỉ khác phần hiển thị.
export function useDiscountManager() {
    const { ready, error: accessError, hotelId: myHotelId, isSuperAdmin, hasPermission } = useAdminAccess();
    const permissions = {
        canCreate: hasPermission("DISCOUNT_CREATE"),
        canUpdate: hasPermission("DISCOUNT_UPDATE"),
        canDelete: hasPermission("DISCOUNT_DELETE"),
    };
    const [today] = useState(todayIso);

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
        listDiscounts({ page: pageNo, size: PAGE_SIZE, query, hotelId: isSuperAdmin ? filterHotelId : null })
            .then((res) => {
                setDiscounts(res.result);
                setTotalPages(res.meta?.totalPages || 1);
            })
            .catch((e) => setListError(e instanceof Error && e.message ? e.message : "Không tải được danh sách"))
            .finally(() => setLoading(false));
    };

    useEffect(load, [ready, pageNo, filterHotelId]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- tải dữ liệu từ API, một external system

    const search = (e: FormEvent) => {
        e.preventDefault();
        setPageNo(1);
        load();
    };

    const changeFilterHotel = (hotelId: number | null) => {
        setFilterHotelId(hotelId);
        setPageNo(1);
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

    const submit = async (e: FormEvent) => {
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
        } catch (err) {
            setFormError(err instanceof AdminApiError ? err.message : "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (d: Discount) => {
        try {
            await updateDiscount(d.id, { ...toInput(d), active: !d.active });
            load();
        } catch (err) {
            setListError(err instanceof AdminApiError ? err.message : "Cập nhật thất bại");
        }
    };

    const remove = async (d: Discount) => {
        if (!confirm(`Xoá khuyến mãi "${d.name}"? Đơn đã đặt trước đó vẫn giữ nguyên giá đã giảm.`)) return;
        try {
            await deleteDiscount(d.id);
            load();
        } catch (err) {
            setListError(err instanceof AdminApiError ? err.message : "Xoá thất bại");
        }
    };

    return {
        ready,
        accessError,
        isSuperAdmin,
        myHotelId,
        permissions,
        today,
        hotels,
        roomsByHotel,
        hotelName,
        roomsLabel,
        list: { discounts, loading, error: listError, pageNo, totalPages, setPageNo, query, setQuery, search },
        filterHotelId,
        changeFilterHotel,
        formState: {
            showForm,
            editingId,
            form,
            setForm,
            scopeAll,
            setScopeAll,
            error: formError,
            saving,
            rooms: form.hotelId ? roomsByHotel[form.hotelId] : undefined,
        },
        openCreate,
        startEdit,
        closeForm,
        changeFormHotel,
        submit,
        toggleActive,
        remove,
    };
}
