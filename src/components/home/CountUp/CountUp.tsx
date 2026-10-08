"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
    value: number;
    /** Thời gian đếm (ms). */
    duration?: number;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Số đếm tăng từ 0 khi lần đầu cuộn tới. Bật "giảm chuyển động" thì hiện ngay số cuối. */
export default function CountUp({ value, duration = 1200 }: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [shown, setShown] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShown(value);
            return;
        }

        let frame = 0;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const start = performance.now();
            const tick = (now: number) => {
                const t = Math.min(1, (now - start) / duration);
                setShown(Math.round(easeOut(t) * value));
                if (t < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        });
        observer.observe(el);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [value, duration]);

    return <span ref={ref}>{shown.toLocaleString("vi-VN")}</span>;
}
