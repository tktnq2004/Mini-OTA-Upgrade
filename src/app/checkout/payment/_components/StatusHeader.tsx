import type { ReactNode } from "react";
import { CheckCircleIcon, CircleNotchIcon, CreditCardIcon, WarningCircleIcon } from "@phosphor-icons/react";
import styles from "../payment.module.css";

type StatusVariant = "error" | "success" | "processing" | "selecting";

interface StatusHeaderProps {
    variant: StatusVariant;
    title: string;
    hint?: ReactNode;
    // Nội dung thêm bên dưới (đồng hồ giữ chỗ, hoá đơn, nút...) — nằm chung
    // khối căn giữa với icon/tiêu đề.
    children?: ReactNode;
}

// Khối icon tròn + tiêu đề + mô tả đầu mỗi màn của trang thanh toán.
export default function StatusHeader({ variant, title, hint, children }: StatusHeaderProps) {
    const wrapClass =
        variant === "error"
            ? styles.statusIconWrapError
            : variant === "success"
              ? styles.statusIconWrapSuccess
              : styles.statusIconWrapProcessing;

    return (
        <div className={styles.statusBlock}>
            <div className={`${styles.statusIconWrap} ${wrapClass}`}>
                {variant === "error" && <WarningCircleIcon size={32} weight="fill" className={styles.errorIcon} />}
                {variant === "success" && <CheckCircleIcon size={36} weight="fill" className={styles.successIcon} />}
                {variant === "processing" && (
                    <CircleNotchIcon size={36} className={`${styles.spin} ${styles.processingIcon}`} />
                )}
                {variant === "selecting" && <CreditCardIcon size={30} weight="light" className={styles.processingIcon} />}
            </div>
            <h1>{title}</h1>
            {hint && <p className={styles.statusHint}>{hint}</p>}
            {children}
        </div>
    );
}
