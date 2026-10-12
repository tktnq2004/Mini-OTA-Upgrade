import styles from "./BrandLogo.module.css";

interface BrandLogoProps {
    className?: string;
}

// Chữ thương hiệu "TrạmOTA" (Nunito Black, "OTA" màu nhấn) — cỡ chữ lấy theo phần tử cha.
export default function BrandLogo({ className }: BrandLogoProps) {
    return (
        <span className={className ? `${styles.logo} ${className}` : styles.logo}>
            Trạm<span className={styles.accent}>OTA</span>
        </span>
    );
}
