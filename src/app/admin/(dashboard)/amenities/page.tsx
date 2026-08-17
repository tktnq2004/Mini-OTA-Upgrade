"use client";

import NameIconManager from "@/components/admin/NameIconManager";
import { createAmenity, deleteAmenity, listAmenities, updateAmenity } from "@/lib/admin/resources";

export default function AmenitiesPage() {
    return (
        <NameIconManager
            title="Tiện nghi"
            subtitle="Tiện nghi có thể gán cho từng phòng (wifi, hồ bơi, bồn tắm...)."
            list={listAmenities}
            create={createAmenity}
            update={updateAmenity}
            remove={deleteAmenity}
        />
    );
}
