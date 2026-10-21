import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit test cho phần logic thuần (tính tiền, ngày, bóc envelope...) — không
// render component. Alias "@/" khớp tsconfig.json.
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
        // Giờ server backend là giờ Việt Nam; chạy test ở múi giờ KHÁC để bắt
        // lỗi đọc nhầm theo múi giờ máy (xem parseServerDateTime).
        env: { TZ: "America/New_York" },
    },
});
