import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
    width?: CSSProperties["width"];
    height?: CSSProperties["height"];
    radius?: CSSProperties["borderRadius"];
    circle?: boolean;
    /** Phủ kín phần tử cha (cha cần position: relative) — dùng cho khung ảnh có aspect-ratio. */
    fill?: boolean;
    /** "inset": nằm trên nền --color-inset (hoá đơn, chân nhóm...) — đậm hơn để không lẫn vào nền. */
    tone?: "default" | "inset";
    className?: string;
}

// Khối xương khi đang tải dữ liệu. Chỉ để trang trí (aria-hidden) — vùng chứa tự khai
// aria-busy + nhãn. Mặc định là 1 dòng chữ chiếm hết chiều ngang.
export default function Skeleton({
    width = "100%",
    height = 12,
    radius,
    circle = false,
    fill = false,
    tone = "default",
    className,
}: SkeletonProps) {
    const classes = [styles.skeleton, fill && styles.fill, tone === "inset" && styles.onInset, className]
        .filter(Boolean)
        .join(" ");
    const style: CSSProperties = fill
        ? { borderRadius: radius ?? 0 }
        : { width, height, borderRadius: circle ? "50%" : radius };
    return <span aria-hidden className={classes} style={style} />;
}
