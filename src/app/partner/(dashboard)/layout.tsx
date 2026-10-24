import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAccessProvider } from "@/components/admin/AdminAccessProvider";
import { ACCESS_COOKIE, PARTNER_HOME, currentPortal, decodeAdminJwt } from "@/lib/admin/session";
import { PartnerHotelProvider } from "../_components/PartnerHotelProvider";
import PartnerShell from "../_components/PartnerShell";

export const metadata: Metadata = {
    title: "Partner",
};

// Cổng /partner dành cho owner/staff (hotelId khác null và khác 0); admin hệ
// thống về /admin. Chỉ là định tuyến/UX — backend vẫn chặn từng API theo quyền
// và theo hotel của người gọi.
export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    const portal = await currentPortal(token);

    if (!portal) redirect("/partner/login");
    if (portal !== PARTNER_HOME) redirect(portal);

    const claims = decodeAdminJwt(token!)!;
    return (
        <AdminAccessProvider>
            <PartnerHotelProvider>
                <PartnerShell user={{ name: claims.user.name, email: claims.user.email }}>{children}</PartnerShell>
            </PartnerHotelProvider>
        </AdminAccessProvider>
    );
}
