"use client";

import { use, useState } from "react";
import Link from "next/link";
import controls from "@/styles/controls.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { discountsForRoom } from "@/lib/partner/roomDiscounts";
import { todayIso } from "@/lib/searchFilters";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import { useHotelDiscounts } from "../../../_lib/useHotelDiscounts";
import { useRoomCatalog } from "../../../_lib/useRoomCatalog";
import styles from "../../../partner.module.css";
import RoomForm from "../_components/RoomForm";

export default function PartnerRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const roomId = Number(id);
    const { hasPermission } = useAdminAccess();
    const { hotel, error } = usePartnerHotel();
    const { amenities, views } = useRoomCatalog();
    const { discounts } = useHotelDiscounts();
    const [today] = useState(todayIso);

    if (error) return <p className={controls.error}>{error}</p>;
    if (!hotel) return <p className={styles.empty}>Đang tải...</p>;

    // Phòng lấy từ hotel của người gọi (GET /hotels/me) — id không thuộc hotel mình coi như không có.
    const room = (hotel.rooms ?? []).find((r) => r.id === roomId);
    if (!room) {
        return (
            <div className={styles.empty}>
                <p>Không tìm thấy phòng này trong khách sạn của bạn.</p>
                <Link href="/partner/rooms" className={styles.link}>
                    Về danh sách phòng
                </Link>
            </div>
        );
    }

    return (
        <RoomForm
            // key: dữ liệu phòng đổi (sau khi lưu ở nơi khác / tạo xong) thì form khởi tạo lại.
            key={`${room.id}-${room.updatedAt ?? ""}`}
            hotelId={hotel.id}
            room={room}
            amenities={amenities}
            views={views}
            discounts={discountsForRoom(discounts, room.id, today)}
            canEdit={hasPermission("ROOM_UPDATE_OWN")}
            canDelete={hasPermission("ROOM_DELETE_OWN")}
        />
    );
}
