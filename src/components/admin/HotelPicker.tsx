"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import controls from "@/styles/controls.module.css";
import { AdminApiError } from "@/lib/admin/apiClient";
import { listHotels } from "@/lib/admin/resources";
import type { Hotel } from "@/lib/admin/types";
import styles from "./HotelPicker.module.css";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
// Còn cách đáy danh sách ngần này px thì tải trang tiếp theo.
const LOAD_MORE_THRESHOLD_PX = 60;

interface HotelPickerProps {
    id?: string;
    value: number | null;
    onChange: (hotelId: number | null) => void;
    // Nhãn của lựa chọn "không chọn hotel" (value = null), vd. "— Giữ nguyên —".
    emptyLabel: string;
}

// Ô chọn khách sạn có tìm kiếm: bấm vào mới mở ô tìm + danh sách. Có hàng trăm hotel nên
// tìm phía server và cuộn tới đâu tải tới đó, thay vì tải hết về một <select>.
export default function HotelPicker({ id, value, onChange, emptyLabel }: HotelPickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pickedName, setPickedName] = useState("");
    // Vị trí đang trỏ bằng phím mũi tên; 0 là dòng "không chọn", 1.. là các hotel.
    const [activeIndex, setActiveIndex] = useState(0);

    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    // Chỉ nhận kết quả của lần gọi mới nhất — gõ nhanh thì phản hồi cũ có thể về sau.
    const requestRef = useRef(0);

    const fetchPage = async (nextPage: number, search: string) => {
        const requestId = ++requestRef.current;
        setLoading(true);
        setError("");
        try {
            const res = await listHotels({ page: nextPage, size: PAGE_SIZE, query: search, sort: "name,asc" });
            if (requestId !== requestRef.current) return;
            setHotels((prev) => (nextPage === 1 ? res.result : [...prev, ...res.result]));
            setTotal(res.meta.total);
            setPage(nextPage);
        } catch (e) {
            if (requestId !== requestRef.current) return;
            setError(e instanceof AdminApiError ? e.message : "Không tải được danh sách khách sạn");
        } finally {
            if (requestId === requestRef.current) setLoading(false);
        }
    };

    // Mở ô hoặc đổi từ khoá -> tải lại từ trang 1 (đợi ngừng gõ một nhịp).
    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => void fetchPage(1, query), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [open, query]);

    // Bấm ra ngoài thì đóng.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // Giữ dòng đang trỏ bằng phím trong vùng nhìn thấy của danh sách.
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex]);

    const openPicker = () => {
        setQuery("");
        setActiveIndex(0);
        setLoading(true); // bật ngay, kẻo trong lúc đợi debounce lại hiện "không tìm thấy"
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    const pick = (hotel: Hotel | null) => {
        setPickedName(hotel?.name ?? "");
        onChange(hotel?.id ?? null);
        close();
    };

    const hasMore = hotels.length < total;

    const handleScroll = (e: UIEvent<HTMLUListElement>) => {
        const el = e.currentTarget;
        if (hasMore && !loading && el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD_PX) {
            void fetchPage(page + 1, query);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, hotels.length));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            // Ô này nằm trong form sửa user — Enter để chọn dòng, không được submit form.
            e.preventDefault();
            pick(activeIndex === 0 ? null : hotels[activeIndex - 1]);
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    };

    const listId = `${id ?? "hotel-picker"}-list`;
    const optionId = (index: number) => `${listId}-${index}`;
    const label = value === null ? emptyLabel : pickedName || `#${value}`;

    return (
        <div className={styles.root} ref={rootRef}>
            <button
                id={id}
                ref={triggerRef}
                type="button"
                className={`${controls.input} ${styles.trigger}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => (open ? close() : openPicker())}
            >
                <span className={value === null ? styles.placeholder : styles.selected} title={label}>
                    {label}
                </span>
                <CaretDownIcon size={13} className={styles.caret} aria-hidden />
            </button>

            {open && (
                <div className={styles.popover}>
                    <div className={styles.searchBox}>
                        <MagnifyingGlassIcon size={15} aria-hidden />
                        <input
                            ref={inputRef}
                            type="text"
                            role="combobox"
                            className={styles.searchInput}
                            placeholder="Tìm theo tên khách sạn"
                            aria-label="Tìm khách sạn"
                            aria-expanded
                            aria-controls={listId}
                            aria-activedescendant={optionId(activeIndex)}
                            autoComplete="off"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setActiveIndex(0);
                                setLoading(true);
                            }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <ul id={listId} ref={listRef} role="listbox" className={styles.list} onScroll={handleScroll}>
                        <li
                            id={optionId(0)}
                            role="option"
                            aria-selected={value === null}
                            data-active={activeIndex === 0}
                            className={activeIndex === 0 ? styles.optionActive : styles.option}
                            onClick={() => pick(null)}
                        >
                            <span className={styles.placeholder}>{emptyLabel}</span>
                        </li>
                        {hotels.map((hotel, i) => (
                            <li
                                key={hotel.id}
                                id={optionId(i + 1)}
                                role="option"
                                aria-selected={value === hotel.id}
                                data-active={activeIndex === i + 1}
                                className={activeIndex === i + 1 ? styles.optionActive : styles.option}
                                onClick={() => pick(hotel)}
                            >
                                <span className={styles.optionName}>{hotel.name}</span>
                                {/* Có hotel trùng tên ở nhiều nơi — địa chỉ + id để phân biệt. */}
                                <span className={styles.optionMeta} title={hotel.address}>
                                    #{hotel.id} · {hotel.address}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className={error ? styles.statusError : styles.status} role={error ? "alert" : undefined}>
                        {error ||
                            (loading
                                ? "Đang tải..."
                                : total === 0
                                  ? "Không tìm thấy khách sạn nào"
                                  : `Đang hiện ${hotels.length} / ${total} khách sạn${hasMore ? " — cuộn để xem thêm" : ""}`)}
                    </p>
                </div>
            )}
        </div>
    );
}
