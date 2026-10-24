"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import controls from "@/styles/controls.module.css";
import ProvinceWardSelect from "@/components/admin/ProvinceWardSelect";
import MediaGallery from "@/components/media/MediaGallery";
import ThumbnailUploader from "@/components/media/ThumbnailUploader";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { AdminApiError } from "@/lib/admin/apiClient";
import { updateHotel } from "@/lib/admin/resources";
import type { Hotel, HotelInput } from "@/lib/admin/types";
import { usePartnerHotel } from "../../_components/PartnerHotelProvider";
import styles from "../../partner.module.css";

const toInput = (h: Hotel): HotelInput => ({
    name: h.name,
    address: h.address,
    image: h.image,
    latitude: h.latitude,
    longitude: h.longitude,
    wardId: h.ward?.id ?? "",
});

// Owner chỉ sửa hotel của mình — không có tạo/xoá hotel (việc của admin hệ thống).
export default function PartnerHotelPage() {
    const { hotel, error } = usePartnerHotel();

    if (error) return <p className={controls.error}>{error}</p>;
    if (!hotel) return <p className={styles.empty}>Đang tải...</p>;
    // key: tải lại hotel (sau khi lưu) thì form khởi tạo lại từ dữ liệu mới.
    return <HotelEditor key={hotel.updatedAt ?? hotel.id} hotel={hotel} />;
}

function HotelEditor({ hotel }: { hotel: Hotel }) {
    const { hasPermission } = useAdminAccess();
    const { reload } = usePartnerHotel();
    const canEdit = hasPermission("HOTEL_UPDATE_OWN");
    const [form, setForm] = useState<HotelInput>(() => toInput(hotel));
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const set = (patch: Partial<HotelInput>) => {
        setSaved(false);
        setForm((f) => ({ ...f, ...patch }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.address.trim()) return setError("Nhập tên và địa chỉ khách sạn");
        if (!form.wardId) return setError("Chọn tỉnh/thành và xã/phường");
        if (!form.latitude || !form.longitude) return setError("Nhập vị trí (vĩ độ, kinh độ) của khách sạn");
        setError("");
        setSaving(true);
        try {
            // Ảnh đại diện lấy theo ảnh đã tải lên (ô "Ảnh đại diện" bên dưới).
            await updateHotel(hotel.id, { ...form, image: hotel.image });
            await reload();
            setSaved(true);
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Lưu thông tin thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Khách sạn của bạn</h1>
                    <p className={styles.subtitle}>
                        Thông tin khách thấy trên Trạm OTA. Muốn thêm hoặc gỡ khách sạn, liên hệ quản trị viên.
                    </p>
                </div>
                <Link href={`/hotel/${hotel.id}`} target="_blank" rel="noopener" className={controls.buttonGhost}>
                    Xem trang khách sạn ↗
                </Link>
            </header>

            <div className={styles.stack}>
                <form className={styles.card} onSubmit={handleSubmit}>
                    <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
                    <fieldset className={`${styles.fieldset} ${styles.formGrid}`} disabled={!canEdit}>
                        <div className={`${controls.field} ${styles.formFull}`}>
                            <label className={controls.label} htmlFor="hotel-name">
                                Tên khách sạn
                            </label>
                            <input
                                id="hotel-name"
                                className={controls.input}
                                value={form.name}
                                onChange={(e) => set({ name: e.target.value })}
                            />
                        </div>
                        <div className={`${controls.field} ${styles.formFull}`}>
                            <label className={controls.label} htmlFor="hotel-address">
                                Địa chỉ
                            </label>
                            <input
                                id="hotel-address"
                                className={controls.input}
                                value={form.address}
                                onChange={(e) => set({ address: e.target.value })}
                            />
                        </div>
                        <ProvinceWardSelect wardId={form.wardId} onChange={(wardId) => set({ wardId })} />
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="hotel-lat">
                                Vĩ độ
                            </label>
                            <input
                                id="hotel-lat"
                                className={controls.input}
                                value={form.latitude}
                                onChange={(e) => set({ latitude: e.target.value })}
                            />
                        </div>
                        <div className={controls.field}>
                            <label className={controls.label} htmlFor="hotel-lng">
                                Kinh độ
                            </label>
                            <input
                                id="hotel-lng"
                                className={controls.input}
                                value={form.longitude}
                                onChange={(e) => set({ longitude: e.target.value })}
                            />
                        </div>
                    </fieldset>
                    {error && <p className={controls.error}>{error}</p>}
                    {canEdit && (
                        <div className={styles.actionsEnd}>
                            {saved && <span className={styles.muted}>Đã lưu</span>}
                            <button type="submit" className={controls.button} disabled={saving}>
                                {saving ? "Đang lưu..." : "Lưu thông tin"}
                            </button>
                        </div>
                    )}
                </form>

                {canEdit && (
                    <div className={styles.split}>
                        <section className={`${styles.card} ${styles.splitMain}`}>
                            <h2 className={styles.cardTitle}>Ảnh đại diện</h2>
                            <p className={styles.muted}>Ảnh hiện ở danh sách khách sạn và đầu trang khách sạn.</p>
                            <ThumbnailUploader ownerType="HOTEL" ownerId={hotel.id} />
                        </section>

                        <section className={`${styles.card} ${styles.splitMain}`}>
                            <div className={styles.cardHead}>
                                <h2 className={styles.cardTitle}>Tour 360°</h2>
                                <Link
                                    href={`/admin/tour/${hotel.id}`}
                                    target="_blank"
                                    rel="noopener"
                                    className={styles.link}
                                >
                                    Mở trình sửa tour ↗
                                </Link>
                            </div>
                            <p className={styles.muted}>
                                Tải ảnh panorama của sảnh, hồ bơi… rồi nối chúng thành tour trong trình sửa tour.
                            </p>
                            <MediaGallery ownerType="HOTEL" ownerId={hotel.id} kind="PANORAMA" />
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
