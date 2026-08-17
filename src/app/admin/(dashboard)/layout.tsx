import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ACCESS_COOKIE, decodeAdminJwt } from "@/lib/admin/session";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;
    const claims = token ? decodeAdminJwt(token) : null;

    if (!claims || claims.role !== "ADMIN") {
        redirect("/admin/login");
    }

    return <AdminShell user={{ name: claims.user.name, email: claims.user.email }}>{children}</AdminShell>;
}
