"use client";

import { use } from "react";
import Link from "next/link";
import controls from "@/styles/controls.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { usePartnerHotel } from "../../../_components/PartnerHotelProvider";
import { useRoomCatalog } from "../../../_lib/useRoomCatalog";
import { useRoomTypes } from "../../../_lib/useRoomTypes";
import styles from "../../../partner.module.css";
import RoomTypeForm from "../_components/RoomTypeForm";

export default function PartnerRoomTypePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const typeId = Number(id);
    const { hasPermission } = useAdminAccess();
    const { hotel, error: hotelError } = usePartnerHotel();
    const { amenities, views } = useRoomCatalog();
    const { roomTypes, error, reload } = useRoomTypes(hotel?.id);

    const loadError = hotelError || error;
    if (loadError) return <p className={controls.error}>{loadError}</p>;
    if (!hotel || !roomTypes) return <p className={styles.empty}>Đang tải...</p>;

    // Chỉ tra trong loại phòng của hotel mình — id của hotel khác coi như không có.
    const roomType = roomTypes.find((t) => t.id === typeId);
    if (!roomType) {
        return (
            <div className={styles.empty}>
                <p>Không tìm thấy loại phòng này trong khách sạn của bạn.</p>
                <Link href="/partner/room-types" className={styles.link}>
                    Về danh sách loại phòng
                </Link>
            </div>
        );
    }

    return (
        <RoomTypeForm
            key={roomType.id}
            hotelId={hotel.id}
            roomType={roomType}
            rooms={(hotel.rooms ?? []).filter((r) => r.roomType?.id === roomType.id)}
            amenities={amenities}
            views={views}
            onSaved={reload}
            canEdit={hasPermission("ROOM_TYPE_UPDATE")}
            canDelete={hasPermission("ROOM_TYPE_DELETE")}
        />
    );
}
