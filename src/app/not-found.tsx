import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/ssr";
import SiteHeader from "@/components/SiteHeader";
import controls from "@/styles/controls.module.css";
import styles from "./not-found.module.css";

export default function NotFound() {
    return (
        <div className={styles.page}>
            <SiteHeader />
            <div className={styles.content}>
                <span className={styles.icon}>
                    <CompassIcon size={20} weight="light" />
                </span>
                <h1>Không tìm thấy trang</h1>
                <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển sang nơi khác.</p>
                <Link href="/" className={controls.button}>
                    Về trang chủ
                </Link>
            </div>
        </div>
    );
}
