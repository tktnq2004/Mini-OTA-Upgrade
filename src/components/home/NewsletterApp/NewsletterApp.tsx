"use client";

import { useState, type FormEvent } from "react";
import {
    AppleLogoIcon,
    BellRingingIcon,
    CheckCircleIcon,
    DeviceMobileIcon,
    GooglePlayLogoIcon,
    StarIcon,
} from "@phosphor-icons/react";
import Reveal from "@/components/home/Reveal/Reveal";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./NewsletterApp.module.css";

/**
 * Nhận tin + tải app — GIAO DIỆN TĨNH: backend chưa có API nhận email, và WenGo chưa có app.
 * TODO: nối form với API đăng ký nhận tin; thay 2 nút "Sắp ra mắt" bằng link store khi có app.
 * Hiện tại gửi form chỉ hiện lời cảm ơn, KHÔNG lưu email ở đâu cả.
 */
export default function NewsletterApp() {
    const { t } = useLanguage();
    const [done, setDone] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDone(true);
    };

    return (
        <Reveal stagger className={styles.grid}>
            <div className={styles.newsletter}>
                <span className={styles.icon}>
                    <BellRingingIcon size={22} weight="light" />
                </span>
                <h2 className={styles.title}>{t("home.newsletter.title")}</h2>
                <p className={styles.text}>{t("home.newsletter.text")}</p>
                {done ? (
                    <p className={styles.thanks} role="status">
                        <CheckCircleIcon size={18} weight="fill" />
                        {t("home.newsletter.thanks")}
                    </p>
                ) : (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <input
                            type="email"
                            required
                            className={styles.input}
                            placeholder={t("home.newsletter.placeholder")}
                            aria-label={t("home.newsletter.placeholder")}
                        />
                        <button type="submit" className={styles.submit}>
                            {t("home.newsletter.submit")}
                        </button>
                    </form>
                )}
                <span className={styles.note}>{t("home.newsletter.note")}</span>
            </div>

            <div className={styles.app}>
                <div className={styles.appText}>
                    <span className={styles.icon}>
                        <DeviceMobileIcon size={22} weight="light" />
                    </span>
                    <h2 className={styles.title}>{t("home.app.title")}</h2>
                    <p className={styles.text}>{t("home.app.text")}</p>
                    <div className={styles.stores}>
                        <span className={styles.store} aria-disabled>
                            <AppleLogoIcon size={20} weight="fill" />
                            <span>
                                <small>{t("home.app.soon")}</small>
                                App Store
                            </span>
                        </span>
                        <span className={styles.store} aria-disabled>
                            <GooglePlayLogoIcon size={20} weight="fill" />
                            <span>
                                <small>{t("home.app.soon")}</small>
                                Google Play
                            </span>
                        </span>
                    </div>
                </div>

                {/* Mockup điện thoại nhỏ — chỉ để trang trí. */}
                <div className={styles.phone} aria-hidden>
                    <div className={styles.phoneScreen}>
                        <span className={styles.phoneLogo}>WenGo</span>
                        <span className={styles.phoneSearch} />
                        {[0, 1].map((i) => (
                            <span key={i} className={styles.phoneCard}>
                                <span className={styles.phoneImg} />
                                <span className={styles.phoneLine} />
                                <span className={styles.phoneStars}>
                                    {Array.from({ length: 5 }, (_, s) => (
                                        <StarIcon key={s} size={7} weight="fill" />
                                    ))}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Reveal>
    );
}
