"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminApiError } from "@/lib/admin/apiClient";
import { getMyAccess } from "@/lib/admin/resources";
import type { CurrentAdmin } from "@/lib/admin/types";

interface AdminAccessValue {
    me: CurrentAdmin | null;
    error: string | null;
    ready: boolean;
    hasModule: (module: string) => boolean;
    hasPermission: (permissionName: string) => boolean;
    hotelId: number | null | undefined;
    isSuperAdmin: boolean;
}

const AdminAccessContext = createContext<AdminAccessValue | null>(null);

export function AdminAccessProvider({ children }: { children: ReactNode }) {
    const [me, setMe] = useState<CurrentAdmin | null>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getMyAccess()
            .then((data) => {
                if (cancelled) return;
                setMe(data);
                setReady(true);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e instanceof AdminApiError ? e.message : "Không tải được thông tin quyền của bạn");
                // ready giữ nguyên false — xem ghi chú ở AdminAccessValue.ready.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const permissionNames = new Set(me?.role?.permissions.map((p) => p.permissionName) ?? []);
    const moduleNames = new Set(me?.role?.permissions.map((p) => p.module) ?? []);

    const value: AdminAccessValue = {
        me,
        error,
        ready,
        hasModule: (module) => !ready || moduleNames.has(module),
        hasPermission: (permissionName) => !ready || permissionNames.has(permissionName),
        hotelId: me?.hotelId,
        isSuperAdmin: me?.hotelId === 0,
    };

    return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
    const ctx = useContext(AdminAccessContext);
    if (!ctx) {
        throw new Error("useAdminAccess must be used within an AdminAccessProvider");
    }
    return ctx;
}
