import { CaretDownIcon } from "@phosphor-icons/react";
import Reveal from "@/components/home/Reveal/Reveal";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./Faq.module.css";

// Nội dung bám đúng tính năng đang có: thanh toán thẻ qua Stripe, chính sách huỷ theo từng phòng
// (Room.cancellationPolicy), đăng nhập OTP, "Đặt phòng của tôi", tour 360°, danh sách yêu thích.
const QUESTIONS = ["payment", "cancel", "bookings", "otp", "tour", "wishlist"] as const;

// Câu hỏi thường gặp — accordion bằng <details> gốc của trình duyệt (bàn phím/đọc màn hình sẵn).
export default function Faq() {
    const { t } = useLanguage();

    return (
        <Reveal stagger className={styles.list}>
            {QUESTIONS.map((key, i) => (
                <details key={key} className={styles.item} open={i === 0}>
                    <summary className={styles.question}>
                        {t(`home.faq.${key}.q`)}
                        <CaretDownIcon size={16} weight="bold" className={styles.caret} />
                    </summary>
                    <p className={styles.answer}>{t(`home.faq.${key}.a`)}</p>
                </details>
            ))}
        </Reveal>
    );
}
