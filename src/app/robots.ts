import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Cho phép index trang công khai; chặn khu admin/partner, API proxy và các trang cá nhân/thanh toán.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/partner", "/api/", "/account", "/checkout", "/complete-profile", "/reset-password"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
