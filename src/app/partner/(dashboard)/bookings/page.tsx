"use client";

import { useState } from "react";
import controls from "@/styles/controls.module.css";
import Pagination from "@/components/Pagination/Pagination";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { AdminApiError } from "@/lib/admin/apiClient";
import { formatDateVn, formatVnd } from "@/lib/format";
import {
    bookingCode,
    bookingNights,
    bookingTotal,
    isCancelled,
    matchesQuery,
    stageOf,
    type BookingStage,
} from "@/lib/partner/bookings";
import { cancelBooking } from "@/lib/partner/resources";
import type { PartnerBooking } from "@/lib/partner/types";
import { todayIso } from "@/lib/searchFilters";
import StatusBadge from "../../_components/StatusBadge";
import { usePartnerBookings } from "../../_lib/usePartnerBookings";
import styles from "../../partner.module.css";

const PAGE_SIZE = 10;

const STAGES: { key: BookingStage; label: string }[] = [
    { key: "upcoming", label: "Sắp đến" },
    { key: "staying", label: "Đang lưu trú" },
    { key: "departed", label: "Đã trả phòng" },
    { key: "cancelled", label: "Đã huỷ" },
];

export default function PartnerBookingsPage() {
    const { hasPermission } = useAdminAccess();
    const { bookings, loading, error, reload } = usePartnerBookings();
    const [today] = useState(todayIso);
    const [stage, setStage] = useState<BookingStage>("upcoming");
    const [query, setQuery] = useState("");
    const [pageNo, setPageNo] = useState(1);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const counts = Object.fromEntries(
        STAGES.map((s) => [s.key, bookings.filter((b) => stageOf(b, today) === s.key).length])
    ) as Record<BookingStage, number>;

    // Sắp đến: gần ngày nhận nhất lên đầu; các nhóm khác: mới nhất lên đầu.
    const filtered = bookings
        .filter((b) => stageOf(b, today) === stage && matchesQuery(b, query))
        .sort((a, b) => (stage === "upcoming" ? a.checkIn.localeCompare(b.checkIn) : b.checkIn.localeCompare(a.checkIn)));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(pageNo, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selected = bookings.find((b) => b.bookingId === selectedId) ?? null;

    const changeStage = (next: BookingStage) => {
        setStage(next);
        setPageNo(1);
        setSelectedId(null);
    };

    return (
        <div>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Đơn đặt phòng</h1>
                    <p className={styles.subtitle}>Tất cả đơn đặt phòng của khách sạn bạn. Bấm 1 đơn để xem chi tiết.</p>
                </div>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.tabs} role="tablist" aria-label="Lọc theo giai đoạn">
                    {STAGES.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            role="tab"
                            aria-selected={stage === s.key}
                            className={stage === s.key ? styles.tabActive : styles.tab}
                            onClick={() => changeStage(s.key)}
                        >
                            {s.label} · {loading ? "…" : counts[s.key]}
                        </button>
                    ))}
                </div>
                <div className={styles.toolbarRight}>
                    <input
                        type="search"
                        className={`${controls.input} ${styles.compactInput}`}
                        placeholder="Mã đơn, tên, email hoặc SĐT"
                        aria-label="Tìm đơn đặt phòng"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPageNo(1);
                        }}
                    />
                </div>
            </div>

            {error && <p className={controls.error}>{error}</p>}

            <div className={styles.split}>
                <section className={`${styles.cardFlush} ${styles.splitMain}`}>
                    {pageRows.length === 0 ? (
                        <p className={styles.empty}>{loading ? "Đang tải..." : "Không có đơn nào."}</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Mã / Khách</th>
                                        <th>Nhận – Trả</th>
                                        <th>Phòng</th>
                                        <th className={styles.num}>Tổng</th>
                                        <th>Thanh toán</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((b) => (
                                        <tr
                                            key={b.bookingId}
                                            className={`${styles.rowButton} ${b.bookingId === selectedId ? styles.rowActive : ""}`}
                                            onClick={() => setSelectedId(b.bookingId)}
                                        >
                                            <td>
                                                {/* Nút thật để chọn đơn bằng bàn phím; cả hàng vẫn bấm được bằng chuột. */}
                                                <button
                                                    type="button"
                                                    className={styles.rowSelect}
                                                    aria-pressed={b.bookingId === selectedId}
                                                    onClick={() => setSelectedId(b.bookingId)}
                                                >
                                                    <span className={styles.cellMain}>{b.guestFullName || "—"}</span>
                                                    <span className={styles.cellSub}>{bookingCode(b)}</span>
                                                </button>
                                            </td>
                                            <td>
                                                {formatDateVn(b.checkIn)} – {formatDateVn(b.checkOut)}
                                            </td>
                                            <td>{b.rooms.map((r) => r.roomName).join(", ")}</td>
                                            <td className={styles.num}>{formatVnd(bookingTotal(b))}</td>
                                            <td>
                                                <StatusBadge status={b.paymentStatus} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className={styles.tableFoot}>
                            <span>
                                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trên{" "}
                                {filtered.length} đơn
                            </span>
                            <Pagination page={currentPage} totalPages={totalPages} onChange={setPageNo} />
                        </div>
                    )}
                </section>

                {/* Chỉ mở khung chi tiết khi đã chọn đơn — chưa chọn thì bảng dùng hết bề ngang. */}
                {selected && (
                    <div className={styles.splitSide}>
                        <BookingDetail
                            booking={selected}
                            canCancel={hasPermission("BOOKING_CANCEL_ROOM") && !isCancelled(selected)}
                            onClose={() => setSelectedId(null)}
                            onCancelled={reload}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

interface BookingDetailProps {
    booking: PartnerBooking;
    canCancel: boolean;
    onClose: () => void;
    onCancelled: () => Promise<void>;
}

function BookingDetail({ booking, canCancel, onClose, onCancelled }: BookingDetailProps) {
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");
    const nights = bookingNights(booking);

    const handleCancel = async () => {
        if (!confirm(`Huỷ đơn ${bookingCode(booking)} của ${booking.guestFullName || "khách"}?`)) return;
        setCancelling(true);
        setError("");
        try {
            await cancelBooking(booking.bookingId);
            await onCancelled();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Huỷ đơn thất bại");
        } finally {
            setCancelling(false);
        }
    };

    return (
        <aside className={styles.panel} aria-label={`Chi tiết đơn ${bookingCode(booking)}`}>
            <div className={styles.panelHead}>
                <div>
                    <p className={styles.cellSub}>
                        Đơn {bookingCode(booking)}
                        {booking.bookingDate ? ` · đặt ${formatDateVn(booking.bookingDate)}` : ""}
                    </p>
                    <h2 className={styles.panelTitle}>{booking.guestFullName || "Khách"}</h2>
                </div>
                <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Đóng chi tiết">
                    ×
                </button>
            </div>

            <StatusBadge status={booking.paymentStatus} />

            <div className={styles.dateChips}>
                <div className={styles.dateChip}>
                    <span className={styles.sectionLabel}>Nhận phòng</span>
                    {formatDateVn(booking.checkIn)}
                </div>
                <div className={styles.dateChip}>
                    <span className={styles.sectionLabel}>Trả phòng</span>
                    {formatDateVn(booking.checkOut)}
                </div>
            </div>

            <div className={styles.lines}>
                <p className={styles.sectionLabel}>Khách</p>
                <span>{booking.guestPhone || "Chưa có SĐT"}</span>
                <span>{booking.guestEmail || "Chưa có email"}</span>
            </div>

            <div className={styles.lines}>
                <p className={styles.sectionLabel}>Phòng</p>
                {booking.rooms.map((r) => (
                    <div key={r.roomId} className={styles.lineRow}>
                        <span>
                            {r.roomName} × {nights} đêm
                        </span>
                        <span>{formatVnd(r.pricePerNight * nights)}</span>
                    </div>
                ))}
                <div className={styles.totalRow}>
                    <span>Tổng</span>
                    <span>{formatVnd(bookingTotal(booking))}</span>
                </div>
            </div>

            {booking.paymentStatus === "Pending" && booking.expirationTime && (
                <p className={styles.notice}>
                    Giữ chỗ hết hạn {formatDateVn(booking.expirationTime)} lúc {booking.expirationTime.slice(11, 16)} nếu khách không
                    thanh toán.
                </p>
            )}

            {error && <p className={controls.error}>{error}</p>}
            {canCancel && (
                <button type="button" className={styles.dangerButton} onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? "Đang huỷ..." : "Huỷ đơn này"}
                </button>
            )}
        </aside>
    );
}
