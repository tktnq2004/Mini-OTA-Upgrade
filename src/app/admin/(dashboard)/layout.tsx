import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ACCESS_COOKIE, decodeAdminJwt, isJwtExpired } from "@/lib/admin/session";

// Không kiểm tra "role" ở đây nữa — JWT không còn mang thông tin quyền nào
// đáng tin (xem session.ts). Việc "tài khoản này có đủ quyền admin không"
// đã được xác nhận 1 lần bằng cách gọi thật API (probeAdminAccess) lúc đăng
// nhập ở route /api/admin/auth/login. Ở đây chỉ cần biết: có đang đăng nhập
// không (có cookie, chưa hết hạn) — mọi hành động CRUD thật sự vẫn được
// chính backend chặn/cho phép theo đúng quyền của tài khoản (@PreAuthorize),
// nên guard này giờ chỉ còn là UX, không phải lớp bảo mật duy nhất nữa.
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;
    const claims = token ? decodeAdminJwt(token) : null;

    if (!claims || isJwtExpired(claims)) {
        redirect("/admin/login");
    }

    return <AdminShell user={{ name: claims.user.name, email: claims.user.email }}>{children}</AdminShell>;
}
