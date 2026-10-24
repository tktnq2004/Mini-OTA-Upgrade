"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import BrandLogo from "@/components/BrandLogo/BrandLogo";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePartnerHotel } from "./PartnerHotelProvider";
import styles from "./PartnerShell.module.css";

// permission: mục chỉ hiện khi tài khoản có quyền đó (staff mặc định chỉ có quyền xem
// đặt phòng/phòng/hotel, không có quyền giảm giá).
const NAV_ITEMS = [
    { href: "/partner", label: "Tổng quan", permission: undefined },
    { href: "/partner/rooms", label: "Phòng", permission: "ROOM_READ" },
    { href: "/partner/hotel", label: "Khách sạn", permission: "HOTEL_READ" },
    { href: "/partner/discounts", label: "Giảm giá", permission: "DISCOUNT_READ" },
    { href: "/partner/bookings", label: "Đơn đặt phòng", permission: "BOOKING_READ_HOTEL" },
] satisfies { href: string; label: string; permission: string | undefined }[];

const ROLE_LABEL: Record<string, string> = {
    ROLE_OWNER: "Chủ khách sạn",
    ROLE_STAFF: "Nhân viên",
};

interface PartnerShellProps {
    user: { name: string; email: string };
    children: React.ReactNode;
}

export default function PartnerShell({ user, children }: PartnerShellProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { me, hasPermission } = useAdminAccess();
    const { hotel } = usePartnerHotel();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        router.push("/partner/login");
        router.refresh();
    };

    const roleName = me?.role?.roleName;
    const roleLabel = roleName ? (ROLE_LABEL[roleName] ?? roleName) : "";
    const isActive = (href: string) => (href === "/partner" ? pathname === "/partner" : pathname.startsWith(href));
    const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
    // Mở thẳng URL của mục không có quyền (vd. staff vào /partner/discounts): báo rõ thay
    // vì để trang gọi API rồi hiện lỗi 403. hasPermission trả true khi quyền chưa tải xong.
    const currentItem = NAV_ITEMS.find((item) => isActive(item.href));
    const forbidden = Boolean(currentItem?.permission && !hasPermission(currentItem.permission));

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <BrandLogo />
                    <span className={styles.badge}>Partner</span>
                </div>

                <div className={styles.hotelCard}>
                    {hotel?.image ? (
                        <ImageWithFallback
                            src={hotel.image}
                            alt=""
                            className={styles.hotelThumb}
                            fallbackClassName={styles.hotelThumb}
                            fallback={null}
                        />
                    ) : (
                        <span className={styles.hotelThumb} aria-hidden />
                    )}
                    <div className={styles.hotelText}>
                        <span className={styles.hotelName}>{hotel?.name ?? "…"}</span>
                        {roleLabel && <span className={styles.hotelRole}>{roleLabel}</span>}
                    </div>
                </div>

                <nav className={styles.nav} aria-label="Menu Partner">
                    {visibleItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={active ? styles.navLinkActive : styles.navLink}
                                aria-current={active ? "page" : undefined}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                    <span className={styles.navSoon}>
                        Nhân viên &amp; vai trò
                        <span className={styles.soonTag}>Sắp có</span>
                    </span>
                </nav>

                <div className={styles.footer}>
                    <span className={styles.user}>
                        <span className={styles.userName}>{user.name || user.email}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                    </span>
                    <div className={styles.footerActions}>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={toggleTheme}
                            aria-label={theme === "light" ? "Chuyển giao diện tối" : "Chuyển giao diện sáng"}
                        >
                            {theme === "light" ? <MoonIcon size={15} weight="bold" /> : <SunIcon size={15} weight="bold" />}
                        </button>
                        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </aside>

            <main className={styles.content}>
                {forbidden ? (
                    <div className={styles.forbidden}>
                        <h1>Bạn không có quyền xem mục này</h1>
                        <p>Tài khoản của bạn chưa được cấp quyền cho &quot;{currentItem?.label}&quot;. Liên hệ chủ khách sạn nếu cần.</p>
                        <Link href="/partner">Về Tổng quan</Link>
                    </div>
                ) : (
                    children
                )}
            </main>
        </div>
    );
}
