// Địa chỉ public của site — gốc cho link tuyệt đối (ảnh chia sẻ, canonical, sitemap, robots).
// Đặt NEXT_PUBLIC_SITE_URL khi deploy (vd. https://wengo.vn).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
