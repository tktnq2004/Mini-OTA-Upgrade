"use client";

import type { CSSProperties } from "react";
import {
    ArrowCounterClockwiseIcon,
    CheckIcon,
    CircleNotchIcon,
    ClockIcon,
    XIcon,
} from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./BookingTracker.module.css";

// Trạng thái từng bước trên thanh theo dõi:
// done = đã qua, current = đang ở đây, upcoming = chưa tới, error = dừng (huỷ/lỗi).
type StepTone = "done" | "current" | "upcoming" | "error";

interface Step {
    key: string;
    tone: StepTone;
}

// paymentStatus -> các bước hiển thị. Luồng chuẩn: Pending -> Processing ->
// Completed. Huỷ/lỗi thanh toán thay các bước còn lại bằng 1 bước đỏ (không
// biết chính xác huỷ ở bước nào, backend chưa trả lịch sử). Hoàn tiền nối
// thêm 1 bước sau Completed. Giá trị lạ -> coi như Pending.
function stepsFor(status: string): Step[] {
    switch (status) {
        case "PROCESSING":
            return [
                { key: "pending", tone: "done" },
                { key: "processing", tone: "current" },
                { key: "completed", tone: "upcoming" },
            ];
        case "Completed":
            return [
                { key: "pending", tone: "done" },
                { key: "processing", tone: "done" },
                { key: "completed", tone: "done" },
            ];
        case "Cancelled":
            return [
                { key: "pending", tone: "done" },
                { key: "cancelled", tone: "error" },
            ];
        case "Failed":
            return [
                { key: "pending", tone: "done" },
                { key: "failed", tone: "error" },
            ];
        case "REFUND_PENDING":
            return [
                { key: "pending", tone: "done" },
                { key: "processing", tone: "done" },
                { key: "completed", tone: "done" },
                { key: "refundPending", tone: "current" },
            ];
        case "REFUNDED":
            return [
                { key: "pending", tone: "done" },
                { key: "processing", tone: "done" },
                { key: "completed", tone: "done" },
                { key: "refunded", tone: "done" },
            ];
        default:
            return [
                { key: "pending", tone: "current" },
                { key: "processing", tone: "upcoming" },
                { key: "completed", tone: "upcoming" },
            ];
    }
}

function StepIcon({ step }: { step: Step }) {
    if (step.tone === "error") return <XIcon size={14} weight="bold" />;
    if (step.tone === "done") return <CheckIcon size={14} weight="bold" />;
    if (step.tone === "current") {
        if (step.key === "processing") return <CircleNotchIcon size={14} weight="bold" className={styles.spin} />;
        if (step.key === "refundPending") return <ArrowCounterClockwiseIcon size={14} weight="bold" />;
        return <ClockIcon size={14} weight="bold" />;
    }
    return null;
}

interface BookingTrackerProps {
    id: string;
    status: string;
    bookedOn?: string; // ngày đặt đã format, hiện dưới bước "Pending"
}

export default function BookingTracker({ id, status, bookedOn }: BookingTrackerProps) {
    const { t } = useLanguage();
    const steps = stepsFor(status);
    const hintKey = `bookings.track.hint.${status}`;
    const hint = t(hintKey);

    return (
        <div id={id} className={styles.tracker}>
            <ol className={styles.steps}>
                {steps.map((step, i) => (
                    <li
                        key={step.key}
                        className={`${styles.step} ${styles[step.tone]}`}
                        aria-current={step.tone === "current" ? "step" : undefined}
                        // --i: thứ tự bước, CSS dùng để chạy hiệu ứng lần lượt từ trái sang.
                        style={{ "--i": i } as CSSProperties}
                    >
                        {i > 0 && (
                            <span className={styles.line} aria-hidden="true">
                                {step.tone !== "upcoming" && <span className={styles.lineFill} />}
                            </span>
                        )}
                        <span className={styles.dot} aria-hidden="true">
                            <StepIcon step={step} />
                        </span>
                        <span className={styles.label}>{t(`bookings.track.${step.key}`)}</span>
                        {step.key === "pending" && bookedOn && <span className={styles.meta}>{bookedOn}</span>}
                    </li>
                ))}
            </ol>
            {hint !== hintKey && <p className={styles.hint}>{hint}</p>}
        </div>
    );
}
