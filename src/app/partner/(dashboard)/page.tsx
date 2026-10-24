"use client";

import { useState } from "react";
import Link from "next/link";
import controls from "@/styles/controls.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { formatVnd } from "@/lib/format";
import { bookingCode, bookingNights, bookingTotal, isCancelled, stageOf } from "@/lib/partner/bookings";
import { addDaysIso, todayIso } from "@/lib/searchFilters";
import { usePartnerHotel } from "../_components/PartnerHotelProvider";
import StatusBadge from "../_components/StatusBadge";
import { usePartnerBookings } from "../_lib/usePartnerBookings";
import styles from "../partner.module.css";

const NEW_BOOKING_DAYS = 7;

// Tổng quan trong ngày — mọi con số tính từ danh sách đơn của hotel (GET /owner/bookings).
export default function PartnerDashboardPage() {
    const { hasPermission } = useAdminAccess();
    const { hotel } = usePartnerHotel();
    const { bookings, loading, error } = usePartnerBookings();
    const [today] = useState(todayIso);
    const [todayLabel] = useState(() =>
        new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    );

    const active = bookings.filter((b) => !isCancelled(b));
    const arrivals = active.filter((b) => b.checkIn === today);
    const departures = active.filter((b) => b.checkOut === today);
    const since = addDaysIso(today, -NEW_BOOKING_DAYS);
    const recent = active.filter((b) => (b.bookingDate ?? "").slice(0, 10) >= since);
    const recentRevenue = recent.reduce((sum, b) => sum + bookingTotal(b), 0);
    // Chỉ đơn còn liên quan (chưa trả phòng) — đơn cũ chưa thanh toán không còn việc gì để làm.
    const pending = bookings.filter((b) => b.paymentStatus === "Pending" && stageOf(b, today) !== "departed");
    const paidArrivals = arrivals.filter((b) => b.paymentStatus === "Completed").length;

    // Việc cần làm: thiếu ảnh làm trang khách sạn kém hấp dẫn.
    const roomsWithoutPhoto = (hotel?.rooms ?? []).filter((r) => !r.thumbnail);
    const canEditHotel = hasPermission("HOTEL_UPDATE_OWN");
    const canEditRooms = hasPermission("ROOM_UPDATE_OWN");
    const todos = [
        hotel && !hotel.image && canEditHotel
            ? { text: "Khách sạn chưa có ảnh đại diện", href: "/partner/hotel", action: "Thêm ảnh" }
            : null,
        roomsWithoutPhoto.length > 0 && canEditRooms
            ? { text: `${roomsWithoutPhoto.length} phòng chưa có ảnh đại diện`, href: "/partner/rooms", action: "Sửa" }
            : null,
    ].filter((t) => t !== null);

    const value = (n: number) => (loading ? "…" : String(n));

    return (
        <div>
            <header className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>{todayLabel}</p>
                    <h1 className={styles.title}>{hotel ? `Hôm nay ở ${hotel.name}` : "Tổng quan"}</h1>
                </div>
                <Link href="/partner/bookings" className={controls.button}>
                    Xem tất cả đặt phòng
                </Link>
            </header>

            {error && <p className={controls.error}>{error}</p>}

            <section className={styles.stats} aria-label="Số liệu hôm nay">
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Nhận phòng hôm nay</span>
                    <span className={styles.statValue}>{value(arrivals.length)}</span>
                    <span className={styles.statHint}>{paidArrivals} đơn đã thanh toán trước</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Trả phòng hôm nay</span>
                    <span className={styles.statValue}>{value(departures.length)}</span>
                    <span className={styles.statHint}>Phòng trống lại từ trưa nay</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Đơn mới {NEW_BOOKING_DAYS} ngày qua</span>
                    <span className={styles.statValue}>{value(recent.length)}</span>
                    <span className={styles.statHint}>Tổng giá trị {formatVnd(recentRevenue)}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Chưa thanh toán</span>
                    <span className={styles.statValue}>{value(pending.length)}</span>
                    <span className={styles.statHint}>Đơn sắp đến hoặc đang ở, chưa trả tiền</span>
                </div>
            </section>

            <div className={styles.split}>
                <section className={`${styles.cardFlush} ${styles.splitMain}`}>
                    <div className={styles.cardHeadPadded}>
                        <h2 className={styles.cardTitle}>Khách nhận phòng hôm nay</h2>
                        <Link href="/partner/bookings" className={styles.link}>
                            Mở danh sách
                        </Link>
                    </div>
                    {arrivals.length === 0 ? (
                        <p className={styles.empty}>{loading ? "Đang tải..." : "Hôm nay không có khách nhận phòng."}</p>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Khách</th>
                                        <th>Phòng</th>
                                        <th>Số đêm</th>
                                        <th>Thanh toán</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {arrivals.map((b) => (
                                        <tr key={b.bookingId}>
                                            <td>
                                                <span className={styles.cellMain}>{b.guestFullName || "—"}</span>
                                                <span className={styles.cellSub}>
                                                    {bookingCode(b)}
                                                    {b.guestPhone ? ` · ${b.guestPhone}` : ""}
                                                </span>
                                            </td>
                                            <td>{b.rooms.map((r) => r.roomName).join(", ")}</td>
                                            <td>{bookingNights(b)} đêm</td>
                                            <td>
                                                <StatusBadge status={b.paymentStatus} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <div className={`${styles.stack} ${styles.splitSide}`}>
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}>Trả phòng hôm nay</h2>
                        {departures.length === 0 ? (
                            <p className={styles.muted}>{loading ? "Đang tải..." : "Không có khách trả phòng."}</p>
                        ) : (
                            <div className={styles.lines}>
                                {departures.map((b) => (
                                    <div key={b.bookingId} className={styles.lineRow}>
                                        <span>
                                            <span className={styles.cellMain}>{b.rooms.map((r) => r.roomName).join(", ")}</span>
                                            <span className={styles.cellSub}>{b.guestFullName || bookingCode(b)}</span>
                                        </span>
                                        <span className={styles.cellSub}>{bookingCode(b)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {todos.length > 0 && (
                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Việc cần làm</h2>
                            {todos.map((t) => (
                                <div key={t.href} className={styles.lineRow}>
                                    <span className={styles.muted}>{t.text}</span>
                                    <Link href={t.href} className={styles.link}>
                                        {t.action}
                                    </Link>
                                </div>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
