"use client";

import styles from "./adminPage.module.css";

interface ChipPickerItem {
    id: number;
    name: string;
}

interface ChipPickerProps {
    items: ChipPickerItem[];
    selectedIds: number[];
    onToggle: (id: number) => void;
    emptyMessage?: string;
}

// Thay cho <select multiple> gốc — khó dùng vì phải giữ Ctrl/Cmd để chọn
// nhiều mục, không thấy rõ mục nào đang chọn. Ở đây mỗi mục là 1 checkbox
// dạng chip bấm được, wrap tự do, nhìn rõ trạng thái chọn ngay lập tức.
// Dùng chung cho cả chọn nhiều (bên gọi tự cộng/trừ id trong onToggle) lẫn
// chọn 1 (bên gọi luôn thay thế bằng đúng 1 id).
export default function ChipPicker({ items, selectedIds, onToggle, emptyMessage }: ChipPickerProps) {
    if (items.length === 0) {
        return <p className={styles.pickerEmpty}>{emptyMessage ?? "Không có mục nào"}</p>;
    }

    const selected = new Set(selectedIds);

    return (
        <div className={styles.pickerGrid}>
            {items.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                    <label key={item.id} className={isSelected ? styles.pickerChipActive : styles.pickerChip}>
                        <input type="checkbox" checked={isSelected} onChange={() => onToggle(item.id)} />
                        {item.name}
                    </label>
                );
            })}
        </div>
    );
}
