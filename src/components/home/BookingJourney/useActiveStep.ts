"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Theo dõi bước nào đang đi qua dải giữa màn hình. Chỉ setState khi đổi bước (tối đa vài lần cho
 * cả section) — không re-render theo từng nhịp cuộn như cách bám scrollY.
 *   active: bước đang ở giữa màn hình (-1 = chưa cuộn tới bước nào)
 *   seen:   bước xa nhất đã từng tới (dùng để tải lười ảnh 360° chẳng hạn)
 */
export function useActiveStep(count: number, rootMargin = "-45% 0px -45% 0px") {
    const refs = useRef<(HTMLElement | null)[]>([]);
    const [active, setActive] = useState(-1);
    const [seen, setSeen] = useState(-1);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const index = refs.current.indexOf(entry.target as HTMLElement);
                    if (index < 0) continue;
                    setActive(index);
                    setSeen((prev) => Math.max(prev, index));
                }
            },
            { rootMargin }
        );
        refs.current.slice(0, count).forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [count, rootMargin]);

    const register = (index: number) => (el: HTMLElement | null) => {
        refs.current[index] = el;
    };

    return { active, seen, register };
}

/** true khi viewport khớp media query — mặc định true (desktop) cho lần render đầu/SSR. */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(true);

    useEffect(() => {
        const mql = window.matchMedia(query);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMatches(mql.matches);
        const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}
