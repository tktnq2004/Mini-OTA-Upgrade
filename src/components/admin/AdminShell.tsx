"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminAccess } from "./AdminAccessProvider";
import styles from "./AdminShell.module.css";

const NAV_ITEMS = [
    { href: "/admin", label: "Tổng quan", module: undefined },
    { href: "/admin/users", label: "Người dùng", module: "USER" },
    { href: "/admin/roles", label: "Phân quyền", module: "ROLE" },
    { href: "/admin/hotels", label: "Khách sạn", module: "HOTEL" },
    { href: "/admin/roomtypes", label: "Loại phòng", module: "ROOM_TYPE" },
    { href: "/admin/amenities", label: "Tiện nghi", module: "AMENITY" },
    { href: "/admin/views", label: "Hướng nhìn", module: "VIEW" },
    { href: "/admin/discounts", label: "Khuyến mãi", module: "DISCOUNT" },
] satisfies { href: string; label: string; module: string | undefined }[];

interface AdminShellProps {
    user: { name: string; email: string };
    children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { hasModule } = useAdminAccess();

    const handleLogout = async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    };

    const visibleNavItems = NAV_ITEMS.filter((item) => !item.module || hasModule(item.module));

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>Mini-OTA Admin</div>
                <nav className={styles.nav}>
                    {visibleNavItems.map((item) => {
                        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} className={active ? styles.navLinkActive : styles.navLink}>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <div className={styles.main}>
                <header className={styles.topbar}>
                    <span className={styles.topbarUser}>
                        Đăng nhập với <strong>{user.name || user.email}</strong>
                    </span>
                    <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                        Đăng xuất
                    </button>
                </header>
                <main className={styles.content}>{children}</main>
            </div>
        </div>
    );
}
