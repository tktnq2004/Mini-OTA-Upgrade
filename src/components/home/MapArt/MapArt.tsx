import styles from "./MapArt.module.css";

/**
 * Nền bản đồ tối giản (nước, công viên, đường) vẽ bằng SVG theo token màu của site — dùng cho
 * màn "So sánh trên bản đồ" và banner bản đồ ở trang chủ, khỏi phải tải MapLibre chỉ để trang trí.
 */
export default function MapArt({ className }: { className?: string }) {
    return (
        <svg
            className={`${styles.art} ${className ?? ""}`}
            viewBox="0 0 600 400"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
        >
            <path className={styles.water} d="M600 0 V400 H470 Q430 330 470 250 Q520 160 470 80 Q450 30 480 0 Z" />
            <path className={styles.park} d="M60 300 Q90 250 150 270 Q200 290 180 340 Q150 380 90 370 Q40 350 60 300 Z" />
            <path className={styles.park} d="M300 60 Q340 40 370 70 Q390 100 350 115 Q310 120 300 90 Z" />
            <path className={styles.roadWide} d="M-10 210 Q150 190 300 220 T610 200" />
            <path className={styles.roadWide} d="M250 -10 Q240 150 270 260 T260 410" />
            <path className={styles.road} d="M-10 110 Q120 130 250 100 T470 120" />
            <path className={styles.road} d="M90 -10 Q110 120 80 230 T120 410" />
            <path className={styles.road} d="M380 410 Q370 300 420 230 T470 -10" />
            <path className={styles.road} d="M-10 330 Q200 320 300 300 T470 330" />
        </svg>
    );
}
