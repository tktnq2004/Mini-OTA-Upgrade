"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./Scroller.module.css";

interface ScrollerProps {
    children: ReactNode;
    /** Bề rộng mỗi thẻ (giá trị CSS), vd. "min(320px, 82vw)". */
    itemWidth: string;
    ariaLabel: string;
}

/**
 * Băng chuyền ngang: vuốt/cuộn được, mỗi thẻ "bắt" vào mép (scroll-snap), kèm nút ‹ › trên
 * desktop. Nút tự ẩn khi đã ở đầu/cuối — chỉ setState khi trạng thái đó đổi.
 */
export default function Scroller({ children, itemWidth, ariaLabel }: ScrollerProps) {
    const { t } = useLanguage();
    const trackRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const update = () => {
            const start = track.scrollLeft <= 4;
            const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
            setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
        };
        update();
        track.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            track.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    const scrollBy = (direction: 1 | -1) => {
        const track = trackRef.current;
        if (!track) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
    };

    return (
        <div className={styles.scroller}>
            <div
                ref={trackRef}
                className={styles.track}
                style={{ "--item-w": itemWidth } as CSSProperties}
                role="region"
                aria-label={ariaLabel}
                tabIndex={0}
            >
                {children}
            </div>
            <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                onClick={() => scrollBy(-1)}
                hidden={edges.start}
                aria-label={t("home.scroller.prev")}
            >
                <CaretLeftIcon size={16} weight="bold" />
            </button>
            <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                onClick={() => scrollBy(1)}
                hidden={edges.end}
                aria-label={t("home.scroller.next")}
            >
                <CaretRightIcon size={16} weight="bold" />
            </button>
        </div>
    );
}
