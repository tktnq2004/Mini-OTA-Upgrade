import type { ReactNode } from "react";
import Link from "next/link";
import { CompassIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import styles from "./AuthShell.module.css";

const PERKS = [
    "Xác nhận đặt phòng tức thì",
    "Giá tốt nhất, không phụ phí ẩn",
    "Hỗ trợ khách hàng 24/7",
];

interface AuthShellProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
    return (
        <div className={styles.page}>
            <div className={styles.formSide}>
                <div className={styles.formInner}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.mark}>
                            <CompassIcon size={13} weight="bold" />
                        </span>
                        Wen<span className={styles.logoAccent}>Go</span>
                    </Link>

                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.subtitle}>{subtitle}</p>

                    {children}

                    <div className={styles.footer}>{footer}</div>

                    <Link className={styles.skipLink} href="/map">
                        Tiếp tục không cần đăng nhập →
                    </Link>
                </div>
            </div>

            <div className={styles.visualSide}>
                <div className={styles.visualContent}>
                    <blockquote className={styles.quote}>
                        “Mỗi chuyến đi là một câu chuyện. WenGo giúp bạn bắt đầu đúng nơi lưu trú.”
                    </blockquote>
                    <ul className={styles.perks}>
                        {PERKS.map((perk) => (
                            <li key={perk}>
                                <CheckIcon size={14} weight="bold" />
                                {perk}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
