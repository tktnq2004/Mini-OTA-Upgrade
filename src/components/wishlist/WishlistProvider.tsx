"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
    clearWishlist,
    loadWishlist,
    saveWishlist,
    type WishlistItem,
} from "./wishlistStorage";

interface WishlistContextValue {
    items: WishlistItem[];
    count: number;
    isSaved: (hotelId: number, roomId: number) => boolean;
    add: (hotelId: number, roomId: number) => void;
    remove: (hotelId: number, roomId: number) => void;
    clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function keyOf(hotelId: number, roomId: number): string {
    return `${hotelId}:${roomId}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<WishlistItem[]>([]);
    // Tách "đã đọc localStorage xong chưa" khỏi items — để không lỡ ghi đè
    // wishlist đã lưu bằng mảng rỗng ở khoảnh khắc trước khi effect đọc chạy.
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // Đồng bộ với localStorage (hệ thống ngoài React) — không đọc được lúc
        // render vì localStorage không tồn tại khi SSR.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(loadWishlist());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        saveWishlist(items);
    }, [items, hydrated]);

    const isSaved = (hotelId: number, roomId: number) =>
        items.some((it) => keyOf(it.hotelId, it.roomId) === keyOf(hotelId, roomId));

    const add = (hotelId: number, roomId: number) => {
        setItems((current) => {
            if (current.some((it) => keyOf(it.hotelId, it.roomId) === keyOf(hotelId, roomId))) {
                return current;
            }
            return [...current, { hotelId, roomId, addedAt: Date.now() }];
        });
    };

    const remove = (hotelId: number, roomId: number) => {
        setItems((current) =>
            current.filter((it) => keyOf(it.hotelId, it.roomId) !== keyOf(hotelId, roomId))
        );
    };

    const clear = () => {
        setItems([]);
        clearWishlist();
    };

    return (
        <WishlistContext.Provider
            value={{ items, count: items.length, isSaved, add, remove, clear }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const ctx = useContext(WishlistContext);
    if (!ctx) {
        throw new Error("useWishlist must be used within a WishlistProvider");
    }
    return ctx;
}
