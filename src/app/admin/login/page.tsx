import Link from "next/link";
import BackofficeLoginForm from "@/components/backoffice/BackofficeLoginForm";
import styles from "./login.module.css";

export default function AdminLoginPage() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Admin — Trạm OTA</h1>
                <p className={styles.subtitle}>Đăng nhập bằng tài khoản quản trị hệ thống</p>
                <BackofficeLoginForm emailPlaceholder="admin@example.com" />
                <p className={styles.switchPortal}>
                    Chủ khách sạn hoặc nhân viên? <Link href="/partner/login">Đăng nhập trang Partner</Link>
                </p>
            </div>
        </div>
    );
}
