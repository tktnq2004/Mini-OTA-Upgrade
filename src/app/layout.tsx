import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { AccountProvider } from "@/components/auth/AccountProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WenGo",
  description: "WenGo — Đặt phòng khách sạn khắp Việt Nam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Set data-theme trước khi React hydrate để tránh nháy sáng rồi mới chuyển tối */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <AccountProvider>
              <CartProvider>{children}</CartProvider>
            </AccountProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
