"use client";

import { useState } from "react";
import Link from "next/link";
import controls from "@/styles/controls.module.css";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import type { Room } from "@/lib/admin/types";
import { formatVnd } from "@/lib/format";
import { discountsForRoom } from "@/lib/partner/roomDiscounts";
import { todayIso } from "@/lib/searchFilters";
import { usePartnerHotel } from "../../_components/PartnerHotelProvider";
import { useHotelDiscounts } from "../../_lib/useHotelDiscounts";
import styles from "../../partner.module.css";
import page from "./rooms.module.css";

type Filter = "all" | "noPhoto" | "discounted";
// Số tiện nghi hiện tên trong bảng; phần còn lại gộp thành "+N".
const AMENITIES_SHOWN = 3;

// Danh sách phòng dùng hết bề ngang — sửa/thêm phòng ở trang riêng (/partner/rooms/{id}, /new).
export default function PartnerRoomsPage() {
    const { hasPermission } = useAdminAccess();
    const { hotel, error } = usePartnerHotel();
    const { discounts, canRead: canSeeDiscounts } = useHotelDiscounts();
    const [today] = useState(todayIso);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const canCreate = hasPermission("ROOM_CREATE");
    const canUpdate = hasPermission("ROOM_UPDATE_OWN");

    const allRooms = hotel?.rooms ?? [];
    const roomDiscounts = (room: Room) => discountsForRoom(discounts, room.id, today);
    const matchesFilter = (room: Room) =>
        filter === "noPhoto" ? !room.thumbnail : filter === "discounted" ? roomDiscounts(room).length > 0 : true;
    const rooms = allRooms.filter(
        (r) => matchesFilter(r) && r.name.toLowerCase().includes(query.trim().toLowerCase())
    );

    const filters: { key: Filter; label: string; count: number }[] = [
        { key: "all", label: "Tất cả", count: allRooms.length },
        { key: "noPhoto", label: "Thiếu ảnh", count: allRooms.filter((r) => !r.thumbnail).length },
        ...(canSeeDiscounts
            ? [{ key: "discounted" as const, label: "Đang giảm giá", count: allRooms.filter((r) => roomDiscounts(r).length > 0).length }]
            : []),
    ];

    return (
        <div>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Phòng</h1>
                    <p className={styles.subtitle}>
                        {hotel ? `${allRooms.length} phòng.` : "…"} Bấm 1 phòng để mở trang {canUpdate ? "sửa" : "xem"} đầy đủ.
                    </p>
                </div>
                {canCreate && (
                    <Link href="/partner/rooms/new" className={controls.button}>
                        + Thêm phòng
                    </Link>
                )}
            </header>

            <div className={styles.toolbar}>
                <input
                    type="search"
                    className={`${controls.input} ${styles.compactInput}`}
                    placeholder="Tìm theo tên phòng"
                    aria-label="Tìm phòng"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className={styles.tabs} role="tablist" aria-label="Lọc phòng">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.key}
                            className={filter === f.key ? styles.tabActive : styles.tab}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label} · {f.count}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className={controls.error}>{error}</p>}

            <section className={styles.cardFlush}>
                {rooms.length === 0 ? (
                    <p className={styles.empty}>
                        {!hotel && !error ? "Đang tải..." : allRooms.length === 0 ? "Chưa có phòng nào." : "Không có phòng nào khớp."}
                    </p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={`${styles.table} ${page.table}`}>
                            <thead>
                                <tr>
                                    <th>Phòng</th>
                                    <th className={styles.num}>Giá / đêm</th>
                                    <th>Sức chứa</th>
                                    <th>Tiện nghi</th>
                                    <th>Ảnh</th>
                                    {canSeeDiscounts && <th>Giảm giá</th>}
                                    <th aria-label="Thao tác" />
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map((room) => {
                                    const amenities = room.amenities ?? [];
                                    const extra = amenities.length - AMENITIES_SHOWN;
                                    const active = roomDiscounts(room);
                                    return (
                                        <tr key={room.id}>
                                            <td>
                                                <Link href={`/partner/rooms/${room.id}`} className={page.roomCell}>
                                                    {room.thumbnail ? (
                                                        <ImageWithFallback
                                                            src={room.thumbnail}
                                                            alt=""
                                                            className={page.thumb}
                                                            fallbackClassName={page.thumbEmpty}
                                                            fallback={<span>Lỗi ảnh</span>}
                                                        />
                                                    ) : (
                                                        <span className={page.thumbEmpty}>Chưa có</span>
                                                    )}
                                                    <span>
                                                        <span className={styles.cellMain}>{room.name}</span>
                                                        <span className={styles.cellSub}>
                                                            {room.cancellationPolicy ? "Huỷ miễn phí" : "Không hoàn huỷ"}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className={styles.num}>{formatVnd(room.price)}</td>
                                            <td className={page.nowrap}>Tối đa {room.capacity} khách</td>
                                            <td className={page.muted}>
                                                {amenities.length === 0
                                                    ? "—"
                                                    : amenities
                                                          .slice(0, AMENITIES_SHOWN)
                                                          .map((a) => a.name)
                                                          .join(", ") + (extra > 0 ? ` +${extra}` : "")}
                                            </td>
                                            <td>
                                                {room.thumbnail ? (
                                                    <span className={page.muted}>Có ảnh đại diện</span>
                                                ) : (
                                                    <span className={`${styles.badge} ${styles.toneWarning}`}>Thiếu ảnh đại diện</span>
                                                )}
                                            </td>
                                            {canSeeDiscounts && (
                                                <td>
                                                    {active.length === 0 ? (
                                                        <span className={page.muted}>—</span>
                                                    ) : (
                                                        <span className={page.tags}>
                                                            {active.map((d) => (
                                                                <DiscountTag key={d.id} discount={d} />
                                                            ))}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            <td className={page.actionCell}>
                                                <Link href={`/partner/rooms/${room.id}`} className={styles.link}>
                                                    {canUpdate ? "Sửa" : "Xem"}
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
