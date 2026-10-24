import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo/BrandLogo";
import BackofficeLoginForm from "@/components/backoffice/BackofficeLoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = {
    title: "Đăng nhập Partner",
};

export default function PartnerLoginPage() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <BrandLogo />
                    <span className={styles.badge}>Partner</span>
                </div>
                <div>
                    <h1 className={styles.title}>Đăng nhập quản lý khách sạn</h1>
                    <p className={styles.subtitle}>Dành cho chủ khách sạn và nhân viên. Tài khoản do Trạm OTA cấp.</p>
                </div>
                <BackofficeLoginForm emailPlaceholder="ban@khachsan.vn" />
                <p className={styles.switchPortal}>
                    Quản trị viên hệ thống? <Link href="/admin/login">Đăng nhập trang Admin</Link>
                </p>
            </div>
        </div>
    );
}
