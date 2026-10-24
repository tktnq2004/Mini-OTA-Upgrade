import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { AdminAccessProvider } from "@/components/admin/AdminAccessProvider";
import { ACCESS_COOKIE, ADMIN_HOME, currentPortal, decodeAdminJwt } from "@/lib/admin/session";

// Cổng /admin chỉ dành cho admin hệ thống (hotelId = 0); owner/staff có cổng
// riêng /partner. Hỏi /auth/me để biết đúng cổng (JWT không mang hotel/role).
// Đây chỉ là định tuyến/UX — mọi hành động CRUD thật vẫn do backend chặn
// theo quyền của tài khoản (@PreAuthorize + kiểm tra hotel trong service).
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    const portal = await currentPortal(token);

    if (!portal) redirect("/admin/login");
    if (portal !== ADMIN_HOME) redirect(portal);

    const claims = decodeAdminJwt(token!)!;
    return (
        <AdminAccessProvider>
            <AdminShell user={{ name: claims.user.name, email: claims.user.email }}>{children}</AdminShell>
        </AdminAccessProvider>
    );
}
