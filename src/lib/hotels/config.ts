// Chỉ dùng ở server (Server Component, Route Handler) — không có
// "use client", import file này từ client component sẽ lộ env var server
// ra bundle nếu không cẩn thận, nên chỉ gọi từ server.ts / route.ts.
export function getApiBaseUrl(): string {
  const base = process.env.ADMIN_API_BASE_URL;
  if (!base) throw new Error("ADMIN_API_BASE_URL is not configured");
  return base.replace(/\/+$/, "");
}
