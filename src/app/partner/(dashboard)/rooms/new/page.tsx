"use client";

import controls from "@/styles/controls.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import { useRoomCatalog } from "../../../_lib/useRoomCatalog";
import styles from "../../../partner.module.css";
import RoomForm from "../_components/RoomForm";

export default function PartnerNewRoomPage() {
    const { hasPermission } = useAdminAccess();
    const { hotel, error } = usePartnerHotel();
    const { amenities, views } = useRoomCatalog();

    if (error) return <p className={controls.error}>{error}</p>;
    if (!hotel) return <p className={styles.empty}>Đang tải...</p>;
    if (!hasPermission("ROOM_CREATE")) return <p className={styles.empty}>Bạn không có quyền thêm phòng.</p>;

    return (
        <RoomForm
            hotelId={hotel.id}
            room={null}
            amenities={amenities}
            views={views}
            discounts={[]}
            canEdit
            canDelete={false}
        />
    );
}
