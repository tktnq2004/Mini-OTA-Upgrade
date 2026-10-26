"use client";

import controls from "@/styles/controls.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import { useRoomCatalog } from "../../../_lib/useRoomCatalog";
import { useRoomTypes } from "../../../_lib/useRoomTypes";
import styles from "../../../partner.module.css";
import RoomTypeForm from "../_components/RoomTypeForm";

export default function PartnerNewRoomTypePage() {
    const { hasPermission } = useAdminAccess();
    const { hotel, error } = usePartnerHotel();
    const { amenities, views } = useRoomCatalog();
    const { reload } = useRoomTypes(hotel?.id);

    if (error) return <p className={controls.error}>{error}</p>;
    if (!hotel) return <p className={styles.empty}>Đang tải...</p>;
    if (!hasPermission("ROOM_TYPE_CREATE")) return <p className={styles.empty}>Bạn không có quyền thêm loại phòng.</p>;

    return (
        <RoomTypeForm
            hotelId={hotel.id}
            roomType={null}
            rooms={[]}
            amenities={amenities}
            views={views}
            onSaved={reload}
            canEdit
            canDelete={false}
        />
    );
}
