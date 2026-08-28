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

// Chọn tỉnh rồi chọn phường/xã theo đúng tỉnh đó — CHỈ gửi wardId lên
// backend khi submit (HotelInput không có field provinceId, và từ wardId
// luôn suy ra được tỉnh qua Ward.province ở phía backend, nên không cần lưu
// riêng). provinceId ở đây chỉ là state màn hình để lọc dropdown ward, không
// phải dữ liệu gửi đi.
//
// Dùng chung src/data/locations.data.ts (vn-provinces-wards.json) với trang
// Map — id ở backend giờ CHÍNH LÀ mã hành chính VN thật này (Province/Ward.id
// đổi từ auto-increment sang String = Code, xem StartupRunner/ADMIN.md), nên
// không còn cần snapshot DB riêng (admin-locations.json) như trước nữa.
//
// Trả về 2 <div className={controls.field}> làm 2 ô riêng (không bọc thêm
// div ngoài) để xếp thẳng vào .formGrid 2 cột sẵn có của trang cha, giống
// cách Latitude/Longitude đang nằm cạnh nhau.
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
