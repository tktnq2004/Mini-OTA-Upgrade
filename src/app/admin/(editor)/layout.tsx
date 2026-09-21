import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, decodeAdminJwt, isJwtExpired } from "@/lib/admin/session";

// Nhóm route "editor" toàn màn hình — cố ý KHÔNG bọc AdminShell (sidebar +
// header) để công cụ chỉnh sửa có tối đa không gian. Vẫn giữ đúng lớp kiểm
// tra đăng nhập như (dashboard)/layout.tsx; quyền thật sự do backend quyết
// định ở từng API (@PreAuthorize + TourService.assertCanEditHotel).
export default async function AdminEditorLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;
    const claims = token ? decodeAdminJwt(token) : null;

    if (!claims || isJwtExpired(claims)) {
        redirect("/admin/login");
    }

    return <>{children}</>;
}
