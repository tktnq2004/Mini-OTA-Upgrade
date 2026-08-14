import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/ssr";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.mark}>
                        <CompassIcon size={14} weight="bold" />
                    </span>
                    Wen<span className={styles.logoAccent}>Go</span>
                </Link>

                <nav className={styles.nav}>
                    <Link href="/map" className={styles.navLink}>
                        Bản đồ
                    </Link>
                </nav>

                <div className={styles.actions}>
                    <Link href="/login" className={styles.ghostButton}>
                        Đăng nhập
                    </Link>
                    <Link href="/signup" className={styles.solidButton}>
                        Đăng ký
                    </Link>
                </div>
            </div>
        </header>
    );
}
