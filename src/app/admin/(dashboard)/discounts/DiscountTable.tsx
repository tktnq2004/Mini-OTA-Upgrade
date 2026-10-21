"use client";

import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import type { Discount } from "@/lib/admin/types";
import { formatDateVn } from "@/lib/format";
import { STATUS_LABEL, statusOf, type DiscountStatus } from "./discountRules";
import page from "./discounts.module.css";

const STATUS_CLASS: Record<DiscountStatus, string> = {
    running: page.statusRunning,
    upcoming: page.statusUpcoming,
    ended: page.statusEnded,
    paused: page.statusPaused,
};

interface DiscountTableProps {
    discounts: Discount[];
    today: string;
    loading: boolean;
    error: string;
    showHotel: boolean;
    hotelName: (d: Discount) => string;
    roomsLabel: (d: Discount) => string;
    canUpdate: boolean;
    canDelete: boolean;
    onEdit: (d: Discount) => void;
    onToggleActive: (d: Discount) => void;
    onDelete: (d: Discount) => void;
    pageNo: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

// Bảng danh sách khuyến mãi + phân trang.
export default function DiscountTable({
    discounts,
    today,
    loading,
    error,
    showHotel,
    hotelName,
    roomsLabel,
    canUpdate,
    canDelete,
    onEdit,
    onToggleActive,
    onDelete,
    pageNo,
    totalPages,
    onPageChange,
}: DiscountTableProps) {
    return (
        <div className={styles.panel}>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tag</th>
                            {showHotel && <th>Khách sạn</th>}
                            <th>Thời gian (đêm)</th>
                            <th>Phòng áp dụng</th>
                            <th>Trạng thái</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {discounts.map((d) => {
                            const status = statusOf(d, today);
                            return (
                                <tr key={d.id}>
                                    <td>
                                        <DiscountTag discount={d} />
                                    </td>
                                    {showHotel && <td>{hotelName(d)}</td>}
                                    <td className={page.dateCell}>
                                        {formatDateVn(d.startDate)} – {formatDateVn(d.endDate)}
                                    </td>
                                    <td className={page.roomsCell}>{roomsLabel(d)}</td>
                                    <td>
                                        <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
                                    </td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            {canUpdate && (
                                                <button type="button" className={styles.linkButton} onClick={() => onEdit(d)}>
                                                    Sửa
                                                </button>
                                            )}
                                            {canUpdate && status !== "ended" && (
                                                <button type="button" className={styles.linkButton} onClick={() => onToggleActive(d)}>
                                                    {d.active ? "Tắt" : "Bật"}
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button type="button" className={styles.linkButtonDanger} onClick={() => onDelete(d)}>
                                                    Xoá
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!loading && discounts.length === 0 && <p className={styles.emptyState}>Chưa có khuyến mãi nào</p>}
                {loading && <p className={styles.emptyState}>Đang tải...</p>}
            </div>
            {error && (
                <p className={controls.error} style={{ padding: "0 14px 14px" }}>
                    {error}
                </p>
            )}
            <div className={styles.pagination}>
                <button type="button" className={controls.buttonGhost} disabled={pageNo <= 1} onClick={() => onPageChange(pageNo - 1)}>
                    Trước
                </button>
                <span>
                    Trang {pageNo}/{totalPages}
                </span>
                <button
                    type="button"
                    className={controls.buttonGhost}
                    disabled={pageNo >= totalPages}
                    onClick={() => onPageChange(pageNo + 1)}
                >
                    Sau
                </button>
            </div>
        </div>
    );
}
