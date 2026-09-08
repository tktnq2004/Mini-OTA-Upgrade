"use client";

import { useState } from "react";
import controls from "@/styles/controls.module.css";
import { provinces, getWardById, getWardsByProvince } from "@/data/locations.data";

interface ProvinceWardSelectProps {
    wardId: string;
    onChange: (wardId: string) => void;
    // Optional: dùng khi nơi gọi cần biết cả tỉnh đang chọn (vd. lọc theo
    // tỉnh khi chưa chọn phường/xã cụ thể) — form tạo/sửa khách sạn không
    // cần field này vì chỉ gửi wardId lên backend.
    onProvinceChange?: (provinceId: string | null) => void;
}

export default function ProvinceWardSelect({ wardId, onChange, onProvinceChange }: ProvinceWardSelectProps) {
    const [provinceId, setProvinceId] = useState<string | null>(() => getWardById(wardId)?.provinceId ?? null);
    const wardOptions = getWardsByProvince(provinceId);

    const handleProvinceChange = (value: string) => {
        const next = value || null;
        setProvinceId(next);
        onProvinceChange?.(next);
        onChange(""); // đổi tỉnh -> ward cũ (thuộc tỉnh khác) không còn hợp lệ nữa
    };

    return (
        <>
            <div className={controls.field}>
                <label className={controls.label}>Tỉnh / Thành phố</label>
                <select className={controls.select} value={provinceId ?? ""} onChange={(e) => handleProvinceChange(e.target.value)}>
                    <option value="">— chọn tỉnh —</option>
                    {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className={controls.field}>
                <label className={controls.label}>Phường / Xã</label>
                <select
                    className={controls.select}
                    value={wardId || ""}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={!provinceId}
                >
                    <option value="">{provinceId ? "— chọn phường/xã —" : "Chọn tỉnh trước"}</option>
                    {wardOptions.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
            </div>
        </>
    );
}
