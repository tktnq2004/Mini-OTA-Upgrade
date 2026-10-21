import type { Metadata, Viewport } from "next";
import { Inter, Nunito } from "next/font/google";

import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { AccountProvider } from "@/components/auth/AccountProvider";
import { SITE_URL } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Font riêng cho chữ thương hiệu "TrạmOTA" (BrandLogo) — chỉ tải 1 độ đậm.
const nunito = Nunito({
  variable: "--font-brand",
  subsets: ["latin", "vietnamese"],
  weight: "900",
});

const TITLE = "Trạm OTA — Đặt phòng khách sạn khắp Việt Nam";
const DESCRIPTION =
  "So sánh giá và đặt phòng khách sạn khắp Việt Nam: tìm trên bản đồ, xem trước phòng 360°, thanh toán thẻ an toàn.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Trạm OTA",
  },
  description: DESCRIPTION,
  applicationName: "Trạm OTA",
  // Không đặt canonical ở đây: layout gốc được mọi trang kế thừa, sẽ khiến trang nào thiếu
  // canonical riêng bị khai là bản sao của trang chủ. Mỗi trang công khai tự khai canonical.
  openGraph: {
    type: "website",
    siteName: "Trạm OTA",
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/* Set data-theme trước khi React hydrate để tránh nháy sáng rồi mới chuyển tối */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <AccountProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </AccountProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
