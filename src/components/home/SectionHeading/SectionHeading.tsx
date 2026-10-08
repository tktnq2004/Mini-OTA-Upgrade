import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import Reveal from "@/components/home/Reveal/Reveal";
import styles from "./SectionHeading.module.css";

interface SectionHeadingProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    /** Link phụ căn phải, vd. "Xem tất cả →". */
    action?: { href: string; label: string };
}

// Tiêu đề dùng chung cho mọi section ở trang chủ — cùng cỡ chữ, khoảng cách và màu nhấn.
export default function SectionHeading({ eyebrow, title, subtitle, action }: SectionHeadingProps) {
    return (
        <Reveal className={styles.heading}>
            <div className={styles.text}>
                {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
                <h2 className={styles.title}>{title}</h2>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {action && (
                <Link href={action.href} className={styles.action}>
                    {action.label}
                    <ArrowRightIcon size={14} weight="bold" />
                </Link>
            )}
        </Reveal>
    );
}
