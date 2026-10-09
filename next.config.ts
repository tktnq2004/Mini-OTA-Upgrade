import type { NextConfig } from "next";

// Header bảo mật cơ bản cho mọi route. Chưa bật Content-Security-Policy: site nạp Stripe, tile
// bản đồ, ảnh từ nhiều nguồn và 1 script inline (chống nháy theme) — CSP cần liệt kê đủ các
// nguồn đó, làm sai sẽ hỏng thanh toán. TODO: thêm CSP (bắt đầu bằng Report-Only) khi có domain thật.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Không cho site khác nhúng WenGo vào iframe (chống clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Chỉ trang của WenGo được xin vị trí ("Tìm quanh đây"); tắt camera/micro không dùng tới.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(self)" },
  // Chỉ có tác dụng khi chạy HTTPS; trình duyệt bỏ qua header này trên http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Không quảng cáo "X-Powered-By: Next.js" — đỡ lộ công nghệ cho kẻ dò lỗ hổng.
  poweredByHeader: false,
  // Sinh .next/standalone (server.js + node_modules tối thiểu) để image Docker gọn
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
