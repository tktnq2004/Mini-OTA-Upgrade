"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { createHotel, listProvinceNames } from "@/lib/admin/resources";
import type { HotelInput } from "@/lib/admin/types";

const EMPTY: HotelInput = { name: "", address: "", image: "", latitude: "", longitude: "", wardId: 0 };

export default function NewHotelPage() {
    const router = useRouter();
    const [form, setForm] = useState<HotelInput>(EMPTY);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [provinceNames, setProvinceNames] = useState<string[]>([]);

    // Chỉ để tham khảo — API /provinces và /wards/provinces/{id} chỉ trả
    // TÊN, không có id, nên không dùng được để làm dropdown chọn ward thật.
    useEffect(() => {
        listProvinceNames()
            .then(setProvinceNames)
            .catch(() => setProvinceNames([]));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.address || !form.image || !form.latitude || !form.longitude || !form.wardId) {
            setError("Vui lòng nhập đủ thông tin, kể cả ward ID");
            return;
        }
        setError("");
        setSaving(true);
        try {
            const hotel = await createHotel(form);
            router.push(`/admin/hotels/${hotel.id}`);
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Tạo khách sạn thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Thêm khách sạn</h1>
                    <p className={styles.pageSubtitle}>
                        Backend chưa có API liệt kê ward kèm id — Ward ID phải nhập tay (xem ở bảng khách sạn đã có, cột
                        &quot;Phường/xã&quot;).{" "}
                        {provinceNames.length > 0 && <>Tỉnh đã seed: {provinceNames.join(", ")}.</>}
                    </p>
                </div>
            </div>

            <form className={styles.card} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    <div className={`${controls.field} ${styles.formGridFull}`}>
                        <label className={controls.label}>Tên khách sạn</label>
                        <input className={controls.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className={`${controls.field} ${styles.formGridFull}`}>
                        <label className={controls.label}>Địa chỉ (số nhà, tên đường)</label>
                        <input className={controls.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <span style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>
                            Backend tự nối thêm tên phường + tỉnh vào sau khi lưu.
                        </span>
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
                    <div className={controls.field}>
                        <label className={controls.label}>Ward ID</label>
                        <input
                            className={controls.input}
                            type="number"
                            value={form.wardId || ""}
                            onChange={(e) => setForm({ ...form, wardId: Number(e.target.value) })}
                        />
                    </div>
                </div>
                {error && <p className={controls.error}>{error}</p>}
                <div className={styles.formActions}>
                    <button type="submit" className={controls.button} disabled={saving}>
                        {saving ? "Đang tạo..." : "Tạo khách sạn"}
                    </button>
                </div>
            </form>
        </div>
    );
}
