"use client";

import Link from "next/link";
import controls from "@/styles/controls.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { roomTypePolicyLabels } from "@/lib/hotels/roomType";
import { usePartnerHotel } from "../../_components/PartnerHotelProvider";
import { useRoomTypes } from "../../_lib/useRoomTypes";
import styles from "../../partner.module.css";

// Số tiện nghi hiện tên trong bảng; phần còn lại gộp thành "+N".
const AMENITIES_SHOWN = 3;

// Loại phòng của khách sạn — sức chứa, chính sách, tiện nghi, hướng nhìn đặt ở đây và áp
// cho mọi phòng thuộc loại. Sửa/thêm ở trang riêng (/partner/room-types/{id}, /new).
export default function PartnerRoomTypesPage() {
    const { hasPermission } = useAdminAccess();
    const { hotel, error: hotelError } = usePartnerHotel();
    const { roomTypes, error } = useRoomTypes(hotel?.id);

    const canCreate = hasPermission("ROOM_TYPE_CREATE");
    const canUpdate = hasPermission("ROOM_TYPE_UPDATE");
    const roomCount = (typeId: number) => (hotel?.rooms ?? []).filter((r) => r.roomType?.id === typeId).length;
    const loadError = hotelError || error;

    return (
        <div>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Loại phòng</h1>
                    <p className={styles.subtitle}>
                        {roomTypes ? `${roomTypes.length} loại.` : "…"} Mọi phòng cùng loại dùng chung sức chứa, chính
                        sách, tiện nghi và hướng nhìn.
                    </p>
                </div>
                {canCreate && (
                    <Link href="/partner/room-types/new" className={controls.button}>
                        + Thêm loại phòng
                    </Link>
                )}
            </header>

            {loadError && <p className={controls.error}>{loadError}</p>}

            <section className={styles.cardFlush}>
                {!roomTypes || roomTypes.length === 0 ? (
                    <p className={styles.empty}>
                        {!roomTypes ? (loadError ? "" : "Đang tải...") : "Chưa có loại phòng nào. Tạo loại trước rồi mới thêm phòng."}
                    </p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Loại phòng</th>
                                    <th>Sức chứa</th>
                                    <th>Chính sách</th>
                                    <th>Tiện nghi</th>
                                    <th className={styles.num}>Số phòng</th>
                                    <th aria-label="Thao tác" />
                                </tr>
                            </thead>
                            <tbody>
                                {roomTypes.map((t) => {
                                    const extra = t.amenities.length - AMENITIES_SHOWN;
                                    return (
                                        <tr key={t.id}>
                                            <td>
                                                <Link href={`/partner/room-types/${t.id}`} className={styles.cellMain}>
                                                    {t.roomTypeName}
                                                </Link>
                                                {t.views.length > 0 && (
                                                    <span className={styles.cellSub}>{t.views.map((v) => v.name).join(", ")}</span>
                                                )}
                                            </td>
                                            <td>Tối đa {t.capacity} khách</td>
                                            <td className={styles.muted}>{roomTypePolicyLabels(t).join(" · ")}</td>
                                            <td className={styles.muted}>
                                                {t.amenities.length === 0
                                                    ? "—"
                                                    : t.amenities
                                                          .slice(0, AMENITIES_SHOWN)
                                                          .map((a) => a.name)
                                                          .join(", ") + (extra > 0 ? ` +${extra}` : "")}
                                            </td>
                                            <td className={styles.num}>{roomCount(t.id)}</td>
                                            <td>
                                                <Link href={`/partner/room-types/${t.id}`} className={styles.link}>
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
