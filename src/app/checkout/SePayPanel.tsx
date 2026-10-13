"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import { createSePayInfo, SePayError, type SePayInfo } from "@/lib/booking/payment";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";

const COPIED_RESET_MS = 2000;

interface SePayPanelProps {
    bookingId: number;
    // Gọi đúng 1 lần khi đã có đủ thông tin QR — PaymentView dùng để tự bật
    // poll trạng thái booking ngay (chuyển khoản không có bước "xác nhận" nào
    // ở trang này để bấm, khác hẳn thẻ phải confirm qua Stripe trước).
    onReady: () => void;
}

// Hiện QR + thông tin chuyển khoản cho 1 booking — không gọi SDK nào, chỉ gọi
// đúng 1 lần POST /payment/create-payment-intent (provider=SEPAY) để backend
// dựng URL ảnh QR VietQR. Xác nhận đã trả tới qua webhook SePay ở phía
// backend, không phải hành động nào tại đây.
export default function SePayPanel({ bookingId, onReady }: SePayPanelProps) {
    const { t } = useLanguage();
    const [info, setInfo] = useState<SePayInfo | null>(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        createSePayInfo(bookingId)
            .then((result) => {
                if (!alive) return;
                setInfo(result);
                onReady();
            })
            .catch((err) => {
                if (!alive) return;
                setError(err instanceof SePayError && err.message ? err.message : t("checkout.errorSepayUnavailable"));
            });
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ gọi 1 lần cho đúng bookingId, onReady/t ổn định theo lifetime trang
    }, [bookingId]);

    const copy = async (field: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Trình duyệt chặn clipboard (http, iframe...) — vẫn báo để người dùng tự ghi lại.
        }
        setCopied(field);
        window.setTimeout(() => setCopied((c) => (c === field ? null : c)), COPIED_RESET_MS);
    };

    if (error) return <p className={controls.error}>{error}</p>;
    if (!info) return <p className={styles.paymentNote}>{t("checkout.sepayLoading")}</p>;

    const fields: { key: string; label: string; value: string }[] = [
        { key: "amount", label: t("checkout.sepayAmountLabel"), value: formatVnd(info.amount) },
        { key: "account", label: t("checkout.sepayAccountLabel"), value: info.bankAccountNumber },
        { key: "bank", label: t("checkout.sepayBankLabel"), value: info.bankName },
        { key: "content", label: t("checkout.sepayContentLabel"), value: info.transferContent },
    ].filter((f) => f.value);

    return (
        <div className={styles.sepayPanel}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh sinh động từ SePay, không phải asset tĩnh của app */}
            <img src={info.qrImageUrl} alt={t("checkout.sepayQrAlt")} className={styles.sepayQr} />

            <div className={styles.sepayFields}>
                {fields.map((f) => (
                    <div key={f.key} className={styles.sepayField}>
                        <span className={styles.sepayFieldLabel}>{f.label}</span>
                        <div className={styles.sepayFieldValueRow}>
                            <strong className={styles.sepayFieldValue}>{f.value}</strong>
                            <button
                                type="button"
                                className={styles.sepayCopyButton}
                                onClick={() => copy(f.key, f.value)}
                                aria-label={t("checkout.sepayCopy")}
                            >
                                {copied === f.key ? <CheckIcon size={13} weight="bold" /> : <CopyIcon size={13} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <p className={styles.paymentNote}>{t("checkout.sepayHint")}</p>
        </div>
    );
}
