"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAccount } from "@/components/auth/AccountProvider";
import {
    addServerRoom,
    clearWishlist,
    loadWishlist,
    rememberHotels,
    removeServerRoom,
    saveWishlist,
    syncWishlistOnLogin,
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
    const { user, ready } = useAccount();
    const userId = user?.id ?? null;
    const loggedIn = userId !== null;

    const [items, setItems] = useState<WishlistItem[]>([]);
    // Tách "đã nạp xong nguồn dữ liệu chưa" khỏi items — để không lỡ ghi đè
    // wishlist đã lưu bằng mảng rỗng ở khoảnh khắc trước khi nạp xong.
    const [hydrated, setHydrated] = useState(false);

    // Nạp lại mỗi khi đổi người dùng: chưa đăng nhập -> localStorage; đã đăng
    // nhập -> gộp wishlist ở máy lên tài khoản rồi lấy từ backend.
    useEffect(() => {
        if (!ready) return;
        let alive = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHydrated(false);
        if (userId === null) {
            setItems(loadWishlist());
            setHydrated(true);
            return;
        }
        syncWishlistOnLogin(loadWishlist())
            .then((synced) => {
                if (alive) setItems(synced);
            })
            .catch(() => {
                // Backend lỗi: giữ tạm bản ở máy để không mất lựa chọn.
                if (alive) setItems(loadWishlist());
            })
            .finally(() => {
                if (alive) setHydrated(true);
            });
        return () => {
            alive = false;
        };
    }, [ready, userId]);

    // Chỉ khách chưa đăng nhập mới lưu localStorage; tài khoản lưu ở backend.
    useEffect(() => {
        if (!hydrated || loggedIn) return;
        saveWishlist(items);
    }, [items, hydrated, loggedIn]);

    const isSaved = (hotelId: number, roomId: number) =>
        items.some((it) => keyOf(it.hotelId, it.roomId) === keyOf(hotelId, roomId));

    // Cập nhật giao diện ngay, gọi backend nền; lỗi thì hoàn tác.
    const add = (hotelId: number, roomId: number) => {
        if (isSaved(hotelId, roomId)) return;
        const item: WishlistItem = { hotelId, roomId, addedAt: Date.now() };
        setItems((current) => [...current, item]);
        if (loggedIn) {
            rememberHotels([{ roomId, hotelId }]);
            addServerRoom(roomId).catch(() =>
                setItems((current) => current.filter((it) => it.roomId !== roomId))
            );
        }
    };

    const remove = (hotelId: number, roomId: number) => {
        const removed = items.find((it) => keyOf(it.hotelId, it.roomId) === keyOf(hotelId, roomId));
        setItems((current) =>
            current.filter((it) => keyOf(it.hotelId, it.roomId) !== keyOf(hotelId, roomId))
        );
        if (loggedIn && removed) {
            removeServerRoom(roomId).catch(() =>
                setItems((current) =>
                    current.some((it) => it.roomId === roomId) ? current : [...current, removed]
                )
            );
        }
    };

    const clear = () => {
        if (loggedIn) items.forEach((it) => removeServerRoom(it.roomId).catch(() => null));
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
