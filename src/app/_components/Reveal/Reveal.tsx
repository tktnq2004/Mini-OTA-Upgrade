"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Reveal.module.css";

interface RevealProps {
    children: ReactNode;
    className?: string;
    /** Các con trực tiếp hiện so le từng chút một (dùng cho lưới thẻ). */
    stagger?: boolean;
}

/**
 * Hiện dần (mờ → rõ, trượt lên nhẹ) khi khối cuộn vào màn hình — chạy đúng 1 lần rồi thôi theo
 * dõi. Chỉ đổi opacity/transform nên không gây layout lại. Bật "giảm chuyển động" thì CSS cho
 * hiện ngay, không có hiệu ứng.
 */
export default function Reveal({ children, className, stagger }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`${stagger ? styles.stagger : styles.reveal} ${className ?? ""}`}
            data-visible={visible}
        >
            {children}
        </div>
    );
}
