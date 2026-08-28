"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import RoomCard from "@/components/admin/RoomCard";
import ChipPicker from "@/components/admin/ChipPicker";
import ProvinceWardSelect from "@/components/admin/ProvinceWardSelect";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createRoom, deleteHotel, getHotel, listAmenities, listViews, updateHotel } from "@/lib/admin/resources";
import type { Amenity, Hotel, HotelInput, RoomInput, View } from "@/lib/admin/types";

const EMPTY_ROOM: Omit<RoomInput, "hotelId"> = {
    name: "",
    price: 0,
    capacity: 2,
    allowSmoking: false,
    allowPets: false,
    cancellationPolicy: false,
    thumbnail: "",
    description: "",
    roomTypeId: 0,
    amenities_id: [],
    viewIds: [],
};

export default function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const hotelId = Number(id);
    const router = useRouter();

    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [views, setViews] = useState<View[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [form, setForm] = useState<HotelInput | null>(null);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [showAddRoom, setShowAddRoom] = useState(false);
    const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
    const [roomError, setRoomError] = useState("");
    const [roomSaving, setRoomSaving] = useState(false);

    const load = () => {
        setLoading(true);
        setLoadError("");
        Promise.all([getHotel(hotelId), listAmenities(), listViews()])
            .then(([h, a, v]) => {
                setHotel(h);
                setAmenities(a);
                setViews(v);
                setForm({
                    name: h.name,
                    address: h.address,
                    image: h.image,
                    latitude: h.latitude,
                    longitude: h.longitude,
                    wardId: h.ward?.id ?? "",
                });
            })
            .catch((e) => setLoadError(e instanceof AdminApiError ? e.message : "Không tải được khách sạn"))
            .finally(() => setLoading(false));
    };

    useEffect(load, [hotelId]); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const handleSaveHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        if (!form.name || !form.address || !form.image || !form.latitude || !form.longitude || !form.wardId) {
            setFormError("Vui lòng nhập đủ thông tin, kể cả ward ID");
            return;
        }
        setFormError("");
        setSaving(true);
        try {
            await updateHotel(hotelId, form);
            load();
        } catch (e) {
            setFormError(e instanceof AdminApiError ? e.message : "Cập nhật thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteHotel = async () => {
        if (!confirm("Xoá khách sạn này? Toàn bộ phòng thuộc khách sạn cũng sẽ bị xoá.")) return;
        try {
            await deleteHotel(hotelId);
            router.push("/admin/hotels");
        } catch (e) {
            setLoadError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    const handleAddRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomForm.name || !roomForm.price || !roomForm.thumbnail || !roomForm.description || !roomForm.roomTypeId) {
            setRoomError("Vui lòng nhập đủ thông tin, kể cả room type ID");
            return;
        }
        setRoomError("");
        setRoomSaving(true);
        try {
            await createRoom({ ...roomForm, hotelId });
            setRoomForm(EMPTY_ROOM);
            setShowAddRoom(false);
            load();
        } catch (e) {
            setRoomError(e instanceof AdminApiError ? e.message : "Tạo phòng thất bại");
        } finally {
            setRoomSaving(false);
        }
    };

    if (loading) return <p className={styles.emptyState}>Đang tải...</p>;
    if (loadError || !hotel || !form) return <p className={controls.error}>{loadError || "Không tìm thấy khách sạn"}</p>;

    return (
        <div>
            <Link href="/admin/hotels" className={styles.backLink}>
                ← Quay lại danh sách khách sạn
            </Link>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>{hotel.name}</h1>
                    <p className={styles.pageSubtitle}>
                        Khách sạn #{hotel.id} — {hotel.ward?.name}, {hotel.ward?.province?.name} (ward #{hotel.ward?.id})
                    </p>
                </div>
                <button type="button" className={styles.linkButtonDanger} onClick={handleDeleteHotel}>
                    Xoá khách sạn
                </button>
            </div>

            <div className={styles.stack}>
                <form className={styles.card} onSubmit={handleSaveHotel}>
                    <h2 className={styles.cardTitle}>Thông tin khách sạn</h2>
                    <div className={styles.formGrid}>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Tên khách sạn</label>
                            <input className={controls.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>Địa chỉ</label>
                            <input className={controls.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div className={`${controls.field} ${styles.formGridFull}`}>
                            <label className={controls.label}>URL ảnh</label>
                            <input className={controls.input} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Latitude</label>
                            <input className={controls.input} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label}>Longitude</label>
                            <input className={controls.input} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                        </div>
                        <ProvinceWardSelect wardId={form.wardId} onChange={(wardId) => setForm({ ...form, wardId })} />
                    </div>
                    {formError && <p className={controls.error}>{formError}</p>}
                    <div className={styles.formActions}>
                        <button type="submit" className={controls.button} disabled={saving}>
                            {saving ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>

                <div>
                    <div className={styles.pageHeader}>
                        <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                            Phòng ({hotel.rooms?.length ?? 0})
                        </h2>
                        <button type="button" className={controls.button} onClick={() => setShowAddRoom((v) => !v)}>
                            {showAddRoom ? "Đóng" : "Thêm phòng"}
                        </button>
                    </div>

                    {showAddRoom && (
                        <form className={styles.card} onSubmit={handleAddRoom} style={{ marginBottom: 14 }}>
                            <h2 className={styles.cardTitle}>Thêm phòng mới</h2>
                            <div className={styles.formGrid}>
                                <div className={controls.field}>
                                    <label className={controls.label}>Tên phòng</label>
                                    <input
                                        className={controls.input}
                                        value={roomForm.name}
                                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                                    />
                                </div>
                                <div className={controls.field}>
                                    <label className={controls.label}>Giá / đêm</label>
                                    <input
                                        className={controls.input}
                                        type="number"
                                        value={roomForm.price || ""}
                                        onChange={(e) => setRoomForm({ ...roomForm, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div className={controls.field}>
                                    <label className={controls.label}>Sức chứa</label>
                                    <input
                                        className={controls.input}
                                        type="number"
                                        value={roomForm.capacity}
                                        onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                                    />
                                </div>
                                <div className={controls.field}>
                                    <label className={controls.label}>Room type ID</label>
                                    <input
                                        className={controls.input}
                                        type="number"
                                        value={roomForm.roomTypeId || ""}
                                        onChange={(e) => setRoomForm({ ...roomForm, roomTypeId: Number(e.target.value) })}
                                    />
                                </div>
                                <div className={`${controls.field} ${styles.formGridFull}`}>
                                    <label className={controls.label}>URL ảnh thumbnail</label>
                                    <input
                                        className={controls.input}
                                        value={roomForm.thumbnail}
                                        onChange={(e) => setRoomForm({ ...roomForm, thumbnail: e.target.value })}
                                    />
                                </div>
                                <div className={`${controls.field} ${styles.formGridFull}`}>
                                    <label className={controls.label}>Mô tả</label>
                                    <textarea
                                        className={controls.textarea}
                                        value={roomForm.description}
                                        onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                                    />
                                </div>
                                <label className={styles.checkRow}>
                                    <input
                                        type="checkbox"
                                        checked={roomForm.allowSmoking}
                                        onChange={(e) => setRoomForm({ ...roomForm, allowSmoking: e.target.checked })}
                                    />
                                    Cho phép hút thuốc
                                </label>
                                <label className={styles.checkRow}>
                                    <input
                                        type="checkbox"
                                        checked={roomForm.allowPets}
                                        onChange={(e) => setRoomForm({ ...roomForm, allowPets: e.target.checked })}
                                    />
                                    Cho phép thú cưng
                                </label>
                                <label className={styles.checkRow}>
                                    <input
                                        type="checkbox"
                                        checked={roomForm.cancellationPolicy}
                                        onChange={(e) => setRoomForm({ ...roomForm, cancellationPolicy: e.target.checked })}
                                    />
                                    Có chính sách huỷ phòng
                                </label>
                                <div className={`${controls.field} ${styles.formGridFull}`}>
                                    <label className={controls.label}>Tiện nghi</label>
                                    <ChipPicker
                                        items={amenities}
                                        selectedIds={roomForm.amenities_id}
                                        onToggle={(id) =>
                                            setRoomForm({
                                                ...roomForm,
                                                amenities_id: roomForm.amenities_id.includes(id)
                                                    ? roomForm.amenities_id.filter((x) => x !== id)
                                                    : [...roomForm.amenities_id, id],
                                            })
                                        }
                                    />
                                </div>
                                <div className={`${controls.field} ${styles.formGridFull}`}>
                                    <label className={controls.label}>Hướng nhìn</label>
                                    <ChipPicker
                                        items={views}
                                        selectedIds={roomForm.viewIds}
                                        onToggle={(id) =>
                                            setRoomForm({
                                                ...roomForm,
                                                viewIds: roomForm.viewIds.includes(id)
                                                    ? roomForm.viewIds.filter((x) => x !== id)
                                                    : [...roomForm.viewIds, id],
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            {roomError && <p className={controls.error}>{roomError}</p>}
                            <div className={styles.formActions}>
                                <button type="submit" className={controls.button} disabled={roomSaving}>
                                    {roomSaving ? "Đang tạo..." : "Tạo phòng"}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className={styles.stack}>
                        {(hotel.rooms ?? []).map((room) => (
                            <RoomCard key={room.id} room={room} allAmenities={amenities} allViews={views} onChanged={load} />
                        ))}
                        {(hotel.rooms?.length ?? 0) === 0 && <p className={styles.emptyState}>Chưa có phòng nào</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
