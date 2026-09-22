"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompassIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useAccount } from "@/components/auth/AccountProvider";
import styles from "./SiteFooter.module.css";

interface FooterDestination {
  id: string;
  name: string;
}

interface SiteFooterProps {
  // Điểm đến để duyệt thêm (link /map?province={id}) — tuỳ chọn: trang nào không có sẵn dữ
  // liệu này (chưa gọi API khách sạn) thì bỏ trống, cột đó tự ẩn thay vì hiện danh sách rỗng.
  destinations?: FooterDestination[];
}

// Footer đầy đủ, dùng lại đúng các đường dẫn/hook đã có (SiteHeader, AccountProvider,
// ThemeProvider, LanguageProvider) — không thêm mục nào trỏ tới trang chưa tồn tại (vd.
// "Về chúng tôi", "Điều khoản") vì những trang đó chưa được làm, tránh để lại link chết.
export default function SiteFooter({ destinations = [] }: SiteFooterProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { user, ready, logout } = useAccount();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.logo}>
            <span className={styles.mark}>
              <CompassIcon size={14} weight="bold" />
            </span>
            Wen<span className={styles.logoAccent}>Go</span>
          </Link>
          <p className={styles.blurb}>{t("footer.brandBlurb")}</p>
        </div>

        <nav className={styles.col} aria-label={t("footer.exploreTitle")}>
          <h3>{t("footer.exploreTitle")}</h3>
          <Link href="/">{t("footer.home")}</Link>
          <Link href="/map">{t("nav.map")}</Link>
          <Link href="/hotels">{t("nav.hotelsList")}</Link>
          <Link href="/wishlist">{t("wishlist.title")}</Link>
        </nav>

        <nav className={styles.col} aria-label={t("footer.accountTitle")}>
          <h3>{t("footer.accountTitle")}</h3>
          {ready && user ? (
            <>
              <Link href="/account">{t("account.title")}</Link>
              <button type="button" className={styles.linkButton} onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login">{t("nav.login")}</Link>
              <Link href="/signup">{t("nav.signup")}</Link>
            </>
          )}
        </nav>

        {destinations.length > 0 && (
          <nav className={styles.col} aria-label={t("footer.destinationsTitle")}>
            <h3>{t("footer.destinationsTitle")}</h3>
            {destinations.map((destination) => (
              <Link key={destination.id} href={`/map?province=${destination.id}`}>
                {destination.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className={styles.bottom}>
        <span className={styles.copyright}>
          © {new Date().getFullYear()} WenGo. {t("home.footerTagline")}
        </span>
        <div className={styles.bottomActions}>
          <button type="button" className={styles.iconButton} onClick={toggleLanguage} aria-label={t("nav.languageToggle")}>
            {language === "vi" ? "EN" : "VI"}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={theme === "light" ? t("nav.themeToDark") : t("nav.themeToLight")}
          >
            {theme === "light" ? <MoonIcon size={14} weight="bold" /> : <SunIcon size={14} weight="bold" />}
          </button>
        </div>
      </div>
    </footer>
  );
}
