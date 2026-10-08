"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, CopyIcon, SealPercentIcon } from "@phosphor-icons/react";
import Scroller from "@/components/home/Scroller/Scroller";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./PromoCarousel.module.css";

// Giao diện tĩnh: backend CHƯA có hệ thống mã giảm giá — mã ở đây chỉ để trình bày, chưa áp
// dụng được ở bước thanh toán (mỗi thẻ có nhãn "Sắp áp dụng"). TODO: nối API khuyến mãi khi có.
const VOUCHERS = [
    { code: "WENGO10", key: "first" },
    { code: "WEEKEND15", key: "weekend" },
    { code: "EARLY20", key: "early" },
    { code: "STAY3", key: "long" },
] as const;

const TOAST_MS = 2000;

// Băng chuyền ưu đãi kiểu Agoda/Traveloka: 1 banner chiến dịch + các thẻ voucher có nút sao chép mã.
export default function PromoCarousel() {
    const { t } = useLanguage();
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(null), TOAST_MS);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            // Trình duyệt chặn clipboard (http, iframe...) — vẫn báo để người dùng tự ghi lại mã.
        }
        setCopied(code);
    };

    return (
        <>
            <Scroller itemWidth="min(300px, 80vw)" ariaLabel={t("home.promo.title")}>
                <Link href="/hotels" className={styles.campaign}>
                    <span className={styles.campaignTag}>{t("home.promo.campaignTag")}</span>
                    <strong className={styles.campaignTitle}>{t("home.promo.campaignTitle")}</strong>
                    <span className={styles.campaignText}>{t("home.promo.campaignText")}</span>
                    <span className={styles.campaignCta}>
                        {t("home.promo.campaignCta")}
                        <ArrowRightIcon size={14} weight="bold" />
                    </span>
                </Link>

                {VOUCHERS.map(({ code, key }) => (
                    <article key={code} className={styles.voucher}>
                        <div className={styles.voucherStub}>
                            <SealPercentIcon size={22} weight="light" />
                            <strong>{t(`home.promo.${key}.discount`)}</strong>
                        </div>
                        <div className={styles.voucherBody}>
                            <span className={styles.soon}>{t("home.promo.soon")}</span>
                            <strong className={styles.voucherTitle}>{t(`home.promo.${key}.title`)}</strong>
                            <span className={styles.voucherCond}>{t(`home.promo.${key}.cond`)}</span>
                            <button type="button" className={styles.copy} onClick={() => copy(code)}>
                                <span className={styles.code}>{code}</span>
                                {copied === code ? <CheckIcon size={14} weight="bold" /> : <CopyIcon size={14} />}
                            </button>
                        </div>
                    </article>
                ))}
            </Scroller>

            <div className={styles.toast} data-show={copied !== null} role="status" aria-live="polite">
                <CheckIcon size={14} weight="bold" />
                {copied ? t("home.promo.copied", { code: copied }) : ""}
            </div>
        </>
    );
}
