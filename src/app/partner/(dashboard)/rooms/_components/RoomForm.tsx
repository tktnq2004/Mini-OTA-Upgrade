"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import controls from "@/styles/controls.module.css";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import MediaGallery from "@/components/media/MediaGallery";
import ThumbnailUploader from "@/components/media/ThumbnailUploader";
import { AdminApiError, conflictLines } from "@/lib/admin/apiClient";
import { createRoom, deleteRoom, removeRoomRelations, updateRoom } from "@/lib/admin/resources";
import type { Amenity, Discount, Room, View } from "@/lib/admin/types";
import { formatDateVn } from "@/lib/format";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import styles from "../../../partner.module.css";
import form from "./RoomForm.module.css";

interface RoomFormProps {
    hotelId: number;
    // null = thêm phòng mới.
    room: Room | null;
    amenities: Amenity[];
    views: View[];
    // Khuyến mãi đang áp cho phòng này (chỉ hiển thị; sửa ở trang Giảm giá).
    discounts: Discount[];
    canEdit: boolean;
    canDelete: boolean;
}

interface RoomValues {
    name: string;
    description: string;
    price: number;
    capacity: number;
    cancellationPolicy: boolean;
    allowPets: boolean;
    allowSmoking: boolean;
    amenityIds: number[];
    viewIds: number[];
}

const MAX_CAPACITY = 20;

const toValues = (room: Room | null): RoomValues => ({
    name: room?.name ?? "",
    description: room?.description ?? "",
    price: room?.price ?? 0,
    capacity: room?.capacity ?? 2,
    cancellationPolicy: room?.cancellationPolicy ?? true,
    allowPets: room?.allowPets ?? false,
    allowSmoking: room?.allowSmoking ?? false,
    amenityIds: (room?.amenities ?? []).map((a) => a.id).sort((a, b) => a - b),
    viewIds: (room?.views ?? []).map((v) => v.id).sort((a, b) => a - b),
});

const toggle = (ids: number[], id: number) =>
    (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]).sort((a, b) => a - b);
const minus = (a: number[], b: number[]) => a.filter((id) => !b.includes(id));
const sameValues = (a: RoomValues, b: RoomValues) => JSON.stringify(a) === JSON.stringify(b);

const POLICIES: { key: "cancellationPolicy" | "allowPets" | "allowSmoking"; label: string; hint: string }[] = [
    { key: "cancellationPolicy", label: "Huỷ miễn phí", hint: "Khách huỷ đặt phòng không mất phí" },
    { key: "allowPets", label: "Cho mang thú cưng", hint: "Hiện nhãn trên trang phòng" },
    { key: "allowSmoking", label: "Cho hút thuốc", hint: "Hiện nhãn trên trang phòng" },
];

// Trang thêm/sửa 1 phòng (/partner/rooms/new và /partner/rooms/{id}): cột chính là thông
// tin + giá + tiện nghi, cột phụ là ảnh + chính sách + khuyến mãi; thanh lưu dính đáy trang.
export default function RoomForm({ hotelId, room, amenities, views, discounts, canEdit, canDelete }: RoomFormProps) {
    const router = useRouter();
    const { reload } = usePartnerHotel();
    const [initial, setInitial] = useState<RoomValues>(() => toValues(room));
    const [values, setValues] = useState<RoomValues>(initial);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const dirty = !sameValues(values, initial);
    const set = (patch: Partial<RoomValues>) => setValues((v) => ({ ...v, ...patch }));

    // Rời trang khi còn thay đổi chưa lưu -> trình duyệt hỏi lại.
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!values.name.trim()) return setError("Nhập tên phòng");
        if (!(values.price > 0)) return setError("Giá mỗi đêm phải lớn hơn 0");
        if (!(values.capacity >= 1)) return setError("Số khách tối đa ít nhất là 1");
        setError("");
        setSaving(true);
        const fields = {
            name: values.name.trim(),
            description: values.description,
            price: values.price,
            capacity: values.capacity,
            cancellationPolicy: values.cancellationPolicy,
            allowPets: values.allowPets,
            allowSmoking: values.allowSmoking,
        };
        try {
            if (room) {
                // API phòng: thêm quan hệ qua PUT /rooms, gỡ qua DELETE /relationships.
                await updateRoom({
                    roomId: room.id,
                    thumbnail: room.thumbnail ?? "",
                    ...fields,
                    amenities_id: minus(values.amenityIds, initial.amenityIds),
                    viewIds: minus(values.viewIds, initial.viewIds),
                });
                const removedAmenities = minus(initial.amenityIds, values.amenityIds);
                const removedViews = minus(initial.viewIds, values.viewIds);
                if (removedAmenities.length || removedViews.length) {
                    await removeRoomRelations(room.id, removedAmenities, removedViews);
                }
                await reload();
                setInitial(values);
            } else {
                // Loại phòng: backend hiện bỏ qua khi tạo phòng (luôn để trống) nên không hỏi.
                const created = await createRoom({
                    hotelId,
                    thumbnail: "",
                    roomTypeId: 0,
                    ...fields,
                    amenities_id: values.amenityIds,
                    viewIds: values.viewIds,
                });
                await reload();
                // Mở ngay trang sửa của phòng mới để tải ảnh (cần id phòng).
                setInitial(values);
                router.replace(`/partner/rooms/${created.id}`);
            }
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Lưu phòng thất bại");
        } finally {
            setSaving(false);
        }
    };

    // Panorama của phòng đang được hotspot ở nơi khác trỏ tới -> backend trả 409 kèm danh
    // sách; hỏi lại rồi mới xoá kèm (giống trang admin).
    const handleDelete = async () => {
        if (!room) return;
        if (!confirm(`Xoá phòng "${room.name}"? Toàn bộ ảnh và panorama của phòng cũng bị xoá vĩnh viễn.`)) return;
        const done = async () => {
            setInitial(values);
            await reload();
            router.push("/partner/rooms");
        };
        try {
            await deleteRoom(room.id);
            await done();
        } catch (err) {
            if (err instanceof AdminApiError && err.status === 409) {
                const proceed = confirm(
                    `Panorama của phòng "${room.name}" đang được liên kết từ:\n\n` +
                        conflictLines(err)
                            .map((line) => `• ${line}`)
                            .join("\n") +
                        "\n\nXoá phòng sẽ gỡ luôn các liên kết trên. Vẫn xoá?"
                );
                if (!proceed) return;
                try {
                    await deleteRoom(room.id, true);
                    await done();
                } catch (err2) {
                    setError(err2 instanceof AdminApiError ? err2.message : "Xoá phòng thất bại");
                }
                return;
            }
            setError(err instanceof AdminApiError ? err.message : "Xoá phòng thất bại");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Link href="/partner/rooms" className={form.back}>
                ← Danh sách phòng
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{room ? room.name : "Thêm phòng"}</h1>
                    <p className={styles.subtitle}>
                        {room
                            ? `Phòng #${room.id}${room.updatedAt ? ` · cập nhật ${formatDateVn(room.updatedAt)}` : ""}`
                            : "Điền thông tin phòng. Tạo xong bạn tải ảnh đại diện và panorama ngay trên trang này."}
                    </p>
                </div>
                {room && (
                    <div className={form.headerActions}>
                        <Link
                            href={`/hotel/${hotelId}/room/${room.id}`}
                            target="_blank"
                            rel="noopener"
                            className={controls.buttonGhost}
                        >
                            Xem như khách ↗
                        </Link>
                        {canDelete && (
                            <button type="button" className={styles.dangerButton} onClick={handleDelete}>
                                Xoá phòng
                            </button>
                        )}
                    </div>
                )}
            </header>

            <div className={form.columns}>
                <fieldset className={`${styles.fieldset} ${form.main}`} disabled={!canEdit}>
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="room-name">
                                Tên phòng
                            </label>
                            <input
                                id="room-name"
                                className={controls.input}
                                value={values.name}
                                onChange={(e) => set({ name: e.target.value })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="room-description">
                                Mô tả
                            </label>
                            <textarea
                                id="room-description"
                                rows={6}
                                className={`${controls.textarea} ${form.description}`}
                                value={values.description}
                                onChange={(e) => set({ description: e.target.value })}
                            />
                            <span className={form.hint}>Khách thấy đoạn này ở trang chi tiết phòng.</span>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}>Giá &amp; sức chứa</h2>
                        <div className={styles.formGrid}>
                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="room-price">
                                    Giá mỗi đêm
                                </label>
                                <div className={form.priceField}>
                                    <input
                                        id="room-price"
                                        type="number"
                                        min={0}
                                        step={1000}
                                        value={values.price || ""}
                                        onChange={(e) => set({ price: Number(e.target.value) })}
                                    />
                                    <span>₫ / đêm</span>
                                </div>
                            </div>
                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="room-capacity">
                                    Số khách tối đa
                                </label>
                                <div className={form.stepper}>
                                    <button
                                        type="button"
                                        aria-label="Giảm số khách"
                                        onClick={() => set({ capacity: Math.max(1, values.capacity - 1) })}
                                        disabled={values.capacity <= 1}
                                    >
                                        −
                                    </button>
                                    <input
                                        id="room-capacity"
                                        type="number"
                                        min={1}
                                        max={MAX_CAPACITY}
                                        value={values.capacity || ""}
                                        onChange={(e) => set({ capacity: Number(e.target.value) })}
                                    />
                                    <button
                                        type="button"
                                        aria-label="Tăng số khách"
                                        onClick={() => set({ capacity: Math.min(MAX_CAPACITY, values.capacity + 1) })}
                                        disabled={values.capacity >= MAX_CAPACITY}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <CheckTiles
                        title="Tiện nghi"
                        items={amenities}
                        selected={values.amenityIds}
                        onToggle={(id) => set({ amenityIds: toggle(values.amenityIds, id) })}
                    />
                    <CheckTiles
                        title="Hướng nhìn"
                        items={views}
                        selected={values.viewIds}
                        onToggle={(id) => set({ viewIds: toggle(values.viewIds, id) })}
                    />
                </fieldset>

                <div className={form.side}>
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}>Ảnh đại diện</h2>
                        {room ? (
                            canEdit ? (
                                <ThumbnailUploader ownerType="ROOM" ownerId={room.id} />
                            ) : (
                                <p className={styles.muted}>{room.thumbnail ? "Đã có ảnh đại diện." : "Chưa có ảnh đại diện."}</p>
                            )
                        ) : (
                            <p className={styles.muted}>Tải ảnh sau khi tạo phòng.</p>
                        )}
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHead}>
                            <h2 className={styles.cardTitle}>Panorama 360°</h2>
                            {room && canEdit && (
                                <Link href={`/admin/tour/${hotelId}`} target="_blank" rel="noopener" className={styles.link}>
                                    Sửa tour ↗
                                </Link>
                            )}
                        </div>
                        {room && canEdit ? (
                            <MediaGallery ownerType="ROOM" ownerId={room.id} kind="PANORAMA" />
                        ) : (
                            <p className={styles.muted}>{room ? "Chỉ người có quyền sửa phòng mới tải panorama." : "Tải panorama sau khi tạo phòng."}</p>
                        )}
                    </section>

                    <section className={styles.card}>
                        <h2 className={styles.cardTitle} id="room-policies">
                            Chính sách
                        </h2>
                        <fieldset className={styles.fieldset} disabled={!canEdit} aria-labelledby="room-policies">
                        {POLICIES.map((p) => (
                            <label key={p.key} className={form.switchRow}>
                                <span>
                                    <span className={form.switchLabel}>{p.label}</span>
                                    <span className={form.hint}>{p.hint}</span>
                                </span>
                                <input
                                    type="checkbox"
                                    role="switch"
                                    className={form.switch}
                                    checked={values[p.key]}
                                    onChange={(e) => set({ [p.key]: e.target.checked })}
                                />
                            </label>
                        ))}
                        </fieldset>
                    </section>

                    {room && discounts.length > 0 && (
                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Giảm giá đang áp dụng</h2>
                            {discounts.map((d) => (
                                <div key={d.id} className={styles.lineRow}>
                                    <DiscountTag discount={d} />
                                    <span className={form.hint}>
                                        {formatDateVn(d.startDate)} – {formatDateVn(d.endDate)}
                                    </span>
                                </div>
                            ))}
                            <Link href="/partner/discounts" className={styles.link}>
                                Quản lý giảm giá →
                            </Link>
                        </section>
                    )}
                </div>
            </div>

            {canEdit && (
                <div className={form.saveBar}>
                    {error ? (
                        <span className={form.error} role="alert">
                            {error}
                        </span>
                    ) : (
                        <span className={dirty ? form.dirty : form.clean}>
                            {dirty ? "● Có thay đổi chưa lưu" : room ? "Đã lưu mọi thay đổi" : ""}
                        </span>
                    )}
                    <div className={form.saveActions}>
                        {room && dirty && (
                            <button type="button" className={controls.buttonGhost} onClick={() => setValues(initial)}>
                                Huỷ thay đổi
                            </button>
                        )}
                        <button type="submit" className={controls.button} disabled={saving || (room !== null && !dirty)}>
                            {saving ? "Đang lưu..." : room ? "Lưu thay đổi" : "Tạo phòng"}
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}

interface CheckTilesProps {
    title: string;
    items: { id: number; name: string }[];
    selected: number[];
    onToggle: (id: number) => void;
}

// Lưới ô tick to, dễ bấm — dùng cho tiện nghi và hướng nhìn.
function CheckTiles({ title, items, selected, onToggle }: CheckTilesProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{title}</h2>
                <span className={form.hint}>
                    {selected.length} / {items.length} đã chọn
                </span>
            </div>
            {items.length === 0 ? (
                <p className={styles.muted}>Đang tải danh sách...</p>
            ) : (
                <div className={form.tiles}>
                    {items.map((item) => {
                        const checked = selected.includes(item.id);
                        return (
                            <label key={item.id} className={checked ? form.tileOn : form.tile}>
                                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                                {item.name}
                            </label>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
