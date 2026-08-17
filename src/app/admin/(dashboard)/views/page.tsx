"use client";

import NameIconManager from "@/components/admin/NameIconManager";
import { createView, deleteView, listViews, updateView } from "@/lib/admin/resources";

export default function ViewsPage() {
    return (
        <NameIconManager
            title="Hướng nhìn"
            subtitle="Hướng nhìn có thể gán cho từng phòng (view biển, view thành phố...)."
            list={listViews}
            create={createView}
            update={updateView}
            remove={deleteView}
        />
    );
}
