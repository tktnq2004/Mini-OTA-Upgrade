"use client";

import { useEffect, useState } from "react";

// Tương đương web của AccessibilityInfo.isReduceMotionEnabled() bên bản React
// Native — mọi animation lặp vô hạn (pulse hotspot) hoặc hiệu ứng chuyển cảnh
// nên đọc giá trị này và tắt/rút gọn khi người dùng đã bật "prefers-reduced-motion".
export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        // Đồng bộ với hệ thống bên ngoài (media query của trình duyệt) — không
        // đọc được lúc render vì window chưa tồn tại khi SSR, giống lý do
        // ThemeProvider/LanguageProvider phải đọc localStorage trong effect.
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReduced(query.matches);

        const handleChange = (e: MediaQueryListEvent) => setReduced(e.matches);
        query.addEventListener("change", handleChange);
        return () => query.removeEventListener("change", handleChange);
    }, []);

    return reduced;
}
