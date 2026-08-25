import Link from "next/link";
import styles from "@/components/admin/adminPage.module.css";

const SECTIONS = [
    { href: "/admin/hotels", title: "Khách sạn", desc: "Tạo, sửa, xoá khách sạn và quản lý phòng của từng khách sạn." },
    { href: "/admin/roomtypes", title: "Loại phòng", desc: "Backend chưa có API liệt kê — tra cứu/sửa/xoá theo ID." },
    { href: "/admin/amenities", title: "Tiện nghi", desc: "Danh sách tiện nghi gán cho phòng (wifi, hồ bơi...)." },
    { href: "/admin/views", title: "Hướng nhìn", desc: "Danh sách hướng nhìn gán cho phòng (biển, thành phố...)." },
    { href: "/admin/users", title: "Người dùng", desc: "Danh sách tài khoản, phân trang, gán role thật cho user." },
    { href: "/admin/roles", title: "Phân quyền", desc: "Tạo role, gán quyền cho role — quyết định quyền thật của tài khoản." },
    { href: "/admin/discounts", title: "Khuyến mãi", desc: "Tạo khuyến mãi (%/số tiền) và gán vào từng phòng kèm khung ngày." },
];

export default function AdminHomePage() {
    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Tổng quan</h1>
                    <p className={styles.pageSubtitle}>Quản trị dữ liệu Mini-OTA — chọn một mục bên trái để bắt đầu.</p>
                </div>
            </div>

            <div className={styles.formGrid}>
                {SECTIONS.map((s) => (
                    <Link key={s.href} href={s.href} className={styles.card} style={{ textDecoration: "none" }}>
                        <h2 className={styles.cardTitle}>{s.title}</h2>
                        <p style={{ margin: 0, fontSize: 12.5, color: "var(--color-text-muted)" }}>{s.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
