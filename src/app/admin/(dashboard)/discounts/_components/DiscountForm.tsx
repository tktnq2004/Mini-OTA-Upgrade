"use client";

import type { FormEvent } from "react";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import type { DiscountInput, DiscountUnit, Hotel, Room } from "@/lib/admin/types";
import { nightReduction } from "@/lib/booking/discount";
import { formatVnd } from "@/lib/format";
import { NAME_MAX } from "../_lib/discountRules";
import page from "../discounts.module.css";

interface DiscountFormProps {
    form: DiscountInput;
    onChange: (form: DiscountInput) => void;
    // true = áp mọi phòng của khách sạn (roomIds gửi lên là []).
    scopeAll: boolean;
    onScopeAllChange: (scopeAll: boolean) => void;
    editingId: number | null;
    // Admin hệ thống mới được chọn khách sạn; owner/staff luôn là hotel của mình.
    canPickHotel: boolean;
    hotels: Hotel[];
    onHotelChange: (hotelId: number | null) => void;
    // undefined = đang tải phòng của khách sạn đã chọn.
    rooms: Room[] | undefined;
    error: string;
    saving: boolean;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
}

// Form tạo / sửa khuyến mãi, kèm ví dụ giá sau giảm cho 1 phòng mẫu.
export default function DiscountForm({
    form,
    onChange,
    scopeAll,
    onScopeAllChange,
    editingId,
    canPickHotel,
    hotels,
    onHotelChange,
    rooms,
    error,
    saving,
    onSubmit,
    onCancel,
}: DiscountFormProps) {
    const set = (patch: Partial<DiscountInput>) => onChange({ ...form, ...patch });

    const toggleRoom = (roomId: number) =>
        set({
            roomIds: form.roomIds.includes(roomId) ? form.roomIds.filter((id) => id !== roomId) : [...form.roomIds, roomId],
        });

    // Discount đang nhập dưới dạng RoomDiscount để dùng lại nightReduction.
    const previewDiscount = { ...form, id: 0 };
    const reductionFor = (price: number) => (form.discountValue > 0 ? nightReduction(price, previewDiscount) : 0);
    // Ví dụ giá sau giảm: phòng đầu tiên được chọn, không thì phòng đầu tiên của hotel.
    const previewRoom = rooms?.find((r) => (scopeAll ? true : form.roomIds.includes(r.id))) ?? null;

    return (
        <form className={styles.card} onSubmit={onSubmit} style={{ marginBottom: 16 }}>
            <h2 className={styles.cardTitle}>{editingId ? `Sửa khuyến mãi #${editingId}` : "Tạo khuyến mãi"}</h2>
            <div className={styles.formGrid}>
                {canPickHotel && (
                    <div className={`${controls.field} ${styles.formGridFull}`}>
                        <label className={controls.label}>Khách sạn</label>
                        <select
                            className={controls.select}
                            value={form.hotelId ?? ""}
                            disabled={editingId !== null}
                            onChange={(e) => onHotelChange(e.target.value ? Number(e.target.value) : null)}
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
                        onChange={(e) => set({ name: e.target.value })}
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
                        onChange={(e) => set({ discountValue: Number(e.target.value) })}
                    />
                </div>
                <div className={controls.field}>
                    <label className={controls.label}>Đơn vị</label>
                    <select
                        className={controls.select}
                        value={form.discountUnit}
                        onChange={(e) => set({ discountUnit: e.target.value as DiscountUnit })}
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
                        onChange={(e) => set({ startDate: e.target.value })}
                    />
                </div>
                <div className={controls.field}>
                    <label className={controls.label}>Đến đêm (bao gồm)</label>
                    <input
                        className={controls.input}
                        type="date"
                        min={form.startDate || undefined}
                        value={form.endDate}
                        onChange={(e) => set({ endDate: e.target.value })}
                    />
                    <p className={page.hint}>Đêm cuối cùng được giảm. Khách ở qua khoảng này chỉ được giảm các đêm nằm bên trong.</p>
                </div>

                <div className={`${controls.field} ${styles.formGridFull}`}>
                    <label className={controls.label}>Phòng áp dụng</label>
                    <div className={page.scopeOptions}>
                        <label className={styles.checkRow}>
                            <input type="radio" checked={scopeAll} onChange={() => onScopeAllChange(true)} />
                            Tất cả phòng của khách sạn (gồm cả phòng thêm sau)
                        </label>
                        <label className={styles.checkRow}>
                            <input type="radio" checked={!scopeAll} onChange={() => onScopeAllChange(false)} />
                            Chọn từng phòng
                        </label>
                    </div>
                    {!scopeAll &&
                        (!form.hotelId ? (
                            <p className={styles.pickerEmpty}>Chọn khách sạn trước.</p>
                        ) : !rooms ? (
                            <p className={styles.pickerEmpty}>Đang tải phòng...</p>
                        ) : rooms.length === 0 ? (
                            <p className={styles.pickerEmpty}>Khách sạn này chưa có phòng nào.</p>
                        ) : (
                            <div className={styles.pickerGrid}>
                                {rooms.map((r) => {
                                    const checked = form.roomIds.includes(r.id);
                                    const reduction = reductionFor(r.price);
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
                    <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
                    Kích hoạt (bỏ chọn để tạm tắt — khách không thấy tag, không được giảm)
                </label>
            </div>

            {previewRoom && form.discountValue > 0 && (
                <div className={page.preview}>
                    Ví dụ: <strong>{previewRoom.name}</strong> {formatVnd(previewRoom.price)} →{" "}
                    <strong>{formatVnd(previewRoom.price - reductionFor(previewRoom.price))}</strong> mỗi đêm được giảm
                    {form.discountUnit === "FIXED_AMOUNT" &&
                        form.discountValue >= previewRoom.price &&
                        " (số tiền giảm ≥ giá phòng: đêm đó miễn phí)"}
                    .
                </div>
            )}

            {error && <p className={controls.error}>{error}</p>}
            <div className={styles.formActions}>
                <button type="submit" className={controls.button} disabled={saving}>
                    {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo"}
                </button>
                <button type="button" className={controls.buttonGhost} onClick={onCancel}>
                    Huỷ
                </button>
            </div>
        </form>
    );
}
