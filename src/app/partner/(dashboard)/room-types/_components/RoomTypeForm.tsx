"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import controls from "@/styles/controls.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createRoomType, deleteRoomType, updateRoomType } from "@/lib/admin/resources";
import type { Amenity, Room, RoomType, RoomTypeInput, View } from "@/lib/admin/types";
import form from "../../../_components/EditForm.module.css";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import styles from "../../../partner.module.css";

interface RoomTypeFormProps {
    hotelId: number;
    // null = thêm loại mới.
    roomType: RoomType | null;
    // Các phòng đang thuộc loại này (để hiện danh sách + chặn xoá).
    rooms: Room[];
    amenities: Amenity[];
    views: View[];
    // Tải lại danh sách loại phòng sau khi lưu/xoá.
    onSaved: () => Promise<void>;
    canEdit: boolean;
    canDelete: boolean;
}

const MAX_CAPACITY = 20;

const toValues = (t: RoomType | null): RoomTypeInput => ({
    roomTypeName: t?.roomTypeName ?? "",
    capacity: t?.capacity ?? 2,
    cancellationPolicy: t?.cancellationPolicy ?? true,
    allowPets: t?.allowPets ?? false,
    allowSmoking: t?.allowSmoking ?? false,
    amenityIds: (t?.amenities ?? []).map((a) => a.id).sort((a, b) => a - b),
    viewIds: (t?.views ?? []).map((v) => v.id).sort((a, b) => a - b),
});

const toggle = (ids: number[], id: number) =>
    (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]).sort((a, b) => a - b);
const sameValues = (a: RoomTypeInput, b: RoomTypeInput) => JSON.stringify(a) === JSON.stringify(b);

const POLICIES: { key: "cancellationPolicy" | "allowPets" | "allowSmoking"; label: string; hint: string }[] = [
    { key: "cancellationPolicy", label: "Huỷ miễn phí", hint: "Khách huỷ đặt phòng không mất phí" },
    { key: "allowPets", label: "Cho mang thú cưng", hint: "Hiện nhãn trên trang phòng" },
    { key: "allowSmoking", label: "Cho hút thuốc", hint: "Hiện nhãn trên trang phòng" },
];

// Trang thêm/sửa 1 loại phòng (/partner/room-types/new và /{id}). Mọi phòng thuộc loại này
// dùng chung sức chứa, chính sách, tiện nghi, hướng nhìn ở đây.
export default function RoomTypeForm({
    hotelId,
    roomType,
    rooms,
    amenities,
    views,
    onSaved,
    canEdit,
    canDelete,
}: RoomTypeFormProps) {
    const router = useRouter();
    const { reload: reloadHotel } = usePartnerHotel();
    const [initial, setInitial] = useState<RoomTypeInput>(() => toValues(roomType));
    const [values, setValues] = useState<RoomTypeInput>(initial);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const dirty = !sameValues(values, initial);
    const set = (patch: Partial<RoomTypeInput>) => setValues((v) => ({ ...v, ...patch }));

    // Rời trang khi còn thay đổi chưa lưu -> trình duyệt hỏi lại.
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const input = { ...values, roomTypeName: values.roomTypeName.trim() };
        if (!input.roomTypeName) return setError("Nhập tên loại phòng");
        if (!(input.capacity >= 1)) return setError("Số khách tối đa ít nhất là 1");
        setError("");
        setSaving(true);
        try {
            if (roomType) {
                await updateRoomType(roomType.id, input);
                // Phòng trả kèm loại phòng -> tải lại cả hotel để danh sách phòng thấy thay đổi.
                await Promise.all([onSaved(), reloadHotel()]);
                setInitial(values);
            } else {
                const created = await createRoomType(hotelId, input);
                await onSaved();
                setInitial(values);
                router.replace(`/partner/room-types/${created.id}`);
            }
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Lưu loại phòng thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!roomType) return;
        // Backend cũng chặn (409) — báo sớm bằng tiếng Việt cho rõ.
        if (rooms.length > 0) {
            setError(`Còn ${rooms.length} phòng thuộc loại này — chuyển các phòng sang loại khác hoặc xoá chúng trước.`);
            return;
        }
        if (!confirm(`Xoá loại phòng "${roomType.roomTypeName}"?`)) return;
        try {
            await deleteRoomType(roomType.id);
            setInitial(values);
            await onSaved();
            router.push("/partner/room-types");
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Xoá loại phòng thất bại");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Link href="/partner/room-types" className={form.back}>
                ← Danh sách loại phòng
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{roomType ? roomType.roomTypeName : "Thêm loại phòng"}</h1>
                    <p className={styles.subtitle}>
                        {roomType
                            ? `Loại phòng #${roomType.id} · ${rooms.length} phòng`
                            : "Mọi phòng thuộc loại này dùng chung sức chứa, chính sách, tiện nghi và hướng nhìn."}
                    </p>
                </div>
                {roomType && canDelete && (
                    <div className={form.headerActions}>
                        <button type="button" className={styles.dangerButton} onClick={handleDelete}>
                            Xoá loại phòng
                        </button>
                    </div>
                )}
            </header>

            <div className={form.columns}>
                <fieldset className={`${styles.fieldset} ${form.main}`} disabled={!canEdit}>
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
                        <div className={styles.formGrid}>
                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="type-name">
                                    Tên loại phòng
                                </label>
                                <input
                                    id="type-name"
                                    className={controls.input}
                                    placeholder="vd. Deluxe hướng biển"
                                    maxLength={100}
                                    value={values.roomTypeName}
                                    onChange={(e) => set({ roomTypeName: e.target.value })}
                                />
                            </div>
                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="type-capacity">
                                    Số khách tối đa / phòng
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
                                        id="type-capacity"
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
                        <h2 className={styles.cardTitle} id="type-policies">
                            Chính sách
                        </h2>
                        <fieldset className={styles.fieldset} disabled={!canEdit} aria-labelledby="type-policies">
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

                    {roomType && (
                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Phòng thuộc loại này</h2>
                            {rooms.length === 0 ? (
                                <p className={styles.muted}>Chưa có phòng nào.</p>
                            ) : (
                                rooms.map((r) => (
                                    <div key={r.id} className={styles.lineRow}>
                                        <Link href={`/partner/rooms/${r.id}`} className={styles.link}>
                                            {r.name}
                                        </Link>
                                    </div>
                                ))
                            )}
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
                            {dirty ? "● Có thay đổi chưa lưu" : roomType ? "Đã lưu mọi thay đổi" : ""}
                        </span>
                    )}
                    <div className={form.saveActions}>
                        {roomType && dirty && (
                            <button type="button" className={controls.buttonGhost} onClick={() => setValues(initial)}>
                                Huỷ thay đổi
                            </button>
                        )}
                        <button type="submit" className={controls.button} disabled={saving || (roomType !== null && !dirty)}>
                            {saving ? "Đang lưu..." : roomType ? "Lưu thay đổi" : "Tạo loại phòng"}
                        </button>
                    </div>
                </div>
            )}
            {!canEdit && error && <p className={controls.error}>{error}</p>}
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
