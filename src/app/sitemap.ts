import type { MetadataRoute } from "next";
import { getApiBaseUrl } from "@/lib/hotels/config";
import { unwrapResponse } from "@/lib/hotels/envelope";
import type { Hotel, Paginated } from "@/lib/hotels/types";
import { SITE_URL } from "@/lib/site";

// Tạo lại tối đa mỗi giờ — đủ để khách sạn mới lên sitemap mà không gọi backend mỗi lượt crawl.
export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/hotels", priority: 0.9, changeFrequency: "daily" },
    { path: "/map", priority: 0.8, changeFrequency: "daily" },
    { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "monthly" },
];

// Danh sách trang khách sạn lấy từ backend; backend lỗi/chưa cấu hình thì vẫn trả phần tĩnh.
async function hotelEntries(): Promise<MetadataRoute.Sitemap> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/hotels?page=1&size=5000`, { next: { revalidate } });
        const page = await unwrapResponse<Paginated<Hotel>>(res);
        return page.result.map((hotel) => ({
            url: `${SITE_URL}/hotel/${hotel.id}`,
            changeFrequency: "weekly",
            priority: 0.7,
        }));
    } catch {
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    return [
        ...STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
            url: `${SITE_URL}${path}`,
            lastModified: now,
            changeFrequency,
            priority,
        })),
        ...(await hotelEntries()),
    ];
}
