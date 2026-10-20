"use client";

import { formatDiscountBadge, type RoomDiscount } from "@/lib/booking/discount";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import styles from "./DiscountTag.module.css";

interface DiscountTagProps {
    discount: Pick<RoomDiscount, "name" | "discountValue" | "discountUnit">;
    // Chỉ hiện mức giảm ("-20%"), bỏ tên — dùng ở chỗ chật như góc ảnh.
    compact?: boolean;
    className?: string;
    // Ép cách hiện số tiền (vd. admin luôn VND); mặc định theo nút ₫/$ ở header.
    formatPrice?: (vnd: number) => string;
}

export default function DiscountTag({ discount, compact, className, formatPrice }: DiscountTagProps) {
    const currency = useCurrency();
    const badge = formatDiscountBadge(discount, formatPrice ?? currency.formatPrice);
    if (compact) {
        return <span className={`${styles.overlay} ${className ?? ""}`}>{badge}</span>;
    }
    return (
        <span className={`${styles.tag} ${className ?? ""}`} title={discount.name}>
            <span className={styles.value}>{badge}</span>
            <span className={styles.name}>{discount.name}</span>
        </span>
    );
}
