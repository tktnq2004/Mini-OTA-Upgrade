import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

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
    <html lang="vi" className={inter.variable}>
      <body>
        {children}

        <Script

          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
        />
        <Script src="https://accounts.google.com/gsi/client" 
          strategy="afterInteractive" async defer 
        />
      </body>
    </html>
  );
}