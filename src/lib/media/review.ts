// Đường dẫn tới trang "review" panorama toàn màn hình (mở ở TAB MỚI từ nơi hiển thị panorama)
// — dựng lại khối cầu 360° bằng three.js để admin/owner xoay thử, phóng to soi nội thất, xác
// nhận đã chọn đúng ảnh. Ảnh thường (không phải panorama) không cần trang này: mở thẳng URL
// gốc trên R2 là đủ, trình duyệt tự có sẵn trình xem ảnh (zoom/pan) — xem ThumbnailUploader.tsx
// và nhánh còn lại của MediaGallery.tsx.
export function panoramaReviewHref(src: string, name?: string): string {
  const params = new URLSearchParams({ src });
  if (name) params.set("name", name);
  return `/admin/panorama/review?${params.toString()}`;
}
