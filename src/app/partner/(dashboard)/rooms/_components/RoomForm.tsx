"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import controls from "@/styles/controls.module.css";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import MediaGallery from "@/components/media/MediaGallery";
import ThumbnailUploader from "@/components/media/ThumbnailUploader";
import { AdminApiError, conflictLines } from "@/lib/admin/apiClient";
import { createRoom, deleteRoom, updateRoom } from "@/lib/admin/resources";
import type { Discount, Room, RoomType } from "@/lib/admin/types";
import { formatDateVn } from "@/lib/format";
import { roomTypePolicyLabels } from "@/lib/hotels/roomType";
import form from "../../../_components/EditForm.module.css";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import styles from "../../../partner.module.css";

interface RoomFormProps {
    hotelId: number;
    // null = thêm phòng mới.
    room: Room | null;
    // Loại phòng của hotel; null = đang tải.
    roomTypes: RoomType[] | null;
    // Khuyến mãi đang áp cho phòng này (chỉ hiển thị; sửa ở trang Giảm giá).
    discounts: Discount[];
    canEdit: boolean;
    canDelete: boolean;
}

// Sức chứa, chính sách, tiện nghi, hướng nhìn thuộc loại phòng (sửa ở /partner/room-types);
// phòng chỉ còn tên, loại, mô tả, giá, ảnh.
interface RoomValues {
    name: string;
    description: string;
    price: number;
    // 0 = chưa chọn.
    roomTypeId: number;
}

const toValues = (room: Room | null): RoomValues => ({
    name: room?.name ?? "",
    description: room?.description ?? "",
    price: room?.price ?? 0,
    roomTypeId: room?.roomType?.id ?? 0,
});

const sameValues = (a: RoomValues, b: RoomValues) => JSON.stringify(a) === JSON.stringify(b);

// Trang thêm/sửa 1 phòng (/partner/rooms/new và /partner/rooms/{id}): cột chính là thông
// tin + giá, cột phụ là ảnh + tóm tắt loại phòng + khuyến mãi; thanh lưu dính đáy trang.
export default function RoomForm({ hotelId, room, roomTypes, discounts, canEdit, canDelete }: RoomFormProps) {
    const router = useRouter();
    const { reload } = usePartnerHotel();
    const [initial, setInitial] = useState<RoomValues>(() => toValues(room));
    const [values, setValues] = useState<RoomValues>(initial);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const dirty = !sameValues(values, initial);
    const set = (patch: Partial<RoomValues>) => setValues((v) => ({ ...v, ...patch }));
    const selectedType = roomTypes?.find((t) => t.id === values.roomTypeId) ?? null;

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
        if (!values.roomTypeId) return setError("Chọn loại phòng");
        setError("");
        setSaving(true);
        const fields = {
            name: values.name.trim(),
            description: values.description,
            price: values.price,
            roomTypeId: values.roomTypeId,
        };
        try {
            if (room) {
                await updateRoom({ roomId: room.id, ...fields });
                await reload();
                setInitial(values);
            } else {
                const created = await createRoom({ hotelId, thumbnail: "", ...fields });
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
                            <label className={controls.label} htmlFor="room-type">
                                Loại phòng
                            </label>
                            <select
                                id="room-type"
                                className={controls.select}
                                value={values.roomTypeId || ""}
                                onChange={(e) => set({ roomTypeId: Number(e.target.value) })}
                            >
                                <option value="">{roomTypes === null ? "Đang tải..." : "— Chọn loại phòng —"}</option>
                                {(roomTypes ?? []).map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.roomTypeName} · tối đa {t.capacity} khách
                                    </option>
                                ))}
                            </select>
                            {roomTypes?.length === 0 ? (
                                <span className={form.hint}>
                                    Khách sạn chưa có loại phòng nào —{" "}
                                    <Link href="/partner/room-types/new" className={styles.link}>
                                        tạo loại phòng
                                    </Link>{" "}
                                    trước.
                                </span>
                            ) : (
                                <span className={form.hint}>Sức chứa, chính sách, tiện nghi, hướng nhìn lấy theo loại phòng.</span>
                            )}
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
                        <h2 className={styles.cardTitle}>Giá</h2>
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
                    </section>
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
                        <div className={styles.cardHead}>
                            <h2 className={styles.cardTitle}>Theo loại phòng</h2>
                            {selectedType && (
                                <Link href={`/partner/room-types/${selectedType.id}`} className={styles.link}>
                                    Sửa loại →
                                </Link>
                            )}
                        </div>
                        {selectedType ? (
                            <dl className={form.summary}>
                                <dt>Sức chứa</dt>
                                <dd>Tối đa {selectedType.capacity} khách</dd>
                                <dt>Chính sách</dt>
                                <dd>{roomTypePolicyLabels(selectedType).join(" · ")}</dd>
                                <dt>Tiện nghi</dt>
                                <dd>{selectedType.amenities.map((a) => a.name).join(", ") || "—"}</dd>
                                <dt>Hướng nhìn</dt>
                                <dd>{selectedType.views.map((v) => v.name).join(", ") || "—"}</dd>
                            </dl>
                        ) : (
                            <p className={styles.muted}>Chọn loại phòng để xem sức chứa, chính sách, tiện nghi.</p>
                        )}
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
