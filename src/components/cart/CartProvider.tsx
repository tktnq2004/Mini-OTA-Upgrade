"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
    clearCartStorage,
    loadCartFromStorage,
    saveCartToStorage,
    type CartItem,
} from "./cartStorage";

interface AddItemMeta {
    checkin: string;
    checkout: string;
    guests: number;
}

interface CartContextValue {
    items: CartItem[];
    totalCount: number;
    isInCart: (hotelId: number, roomId: number) => boolean;
    addItem: (hotelId: number, roomId: number, meta: AddItemMeta) => void;
    removeItem: (hotelId: number, roomId: number) => void;
    setQuantity: (hotelId: number, roomId: number, quantity: number) => void;
    clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(hotelId: number, roomId: number): string {
    return `${hotelId}:${roomId}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    // Tách "đã đọc localStorage xong chưa" khỏi items — để không lỡ ghi đè
    // giỏ đã lưu bằng mảng rỗng trong khoảnh khắc trước khi effect đọc chạy.
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // Đồng bộ với localStorage (hệ thống ngoài React) — không đọc được
        // trong lúc render vì localStorage không tồn tại khi SSR.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(loadCartFromStorage());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        saveCartToStorage(items);
    }, [items, hydrated]);

    const isInCart = (hotelId: number, roomId: number) =>
        items.some((it) => itemKey(it.hotelId, it.roomId) === itemKey(hotelId, roomId));

    const addItem = (hotelId: number, roomId: number, meta: AddItemMeta) => {
        setItems((current) => {
            if (current.some((it) => itemKey(it.hotelId, it.roomId) === itemKey(hotelId, roomId))) {
                return current;
            }
            return [...current, { hotelId, roomId, quantity: 1, ...meta, addedAt: Date.now() }];
        });
    };

    const removeItem = (hotelId: number, roomId: number) => {
        setItems((current) =>
            current.filter((it) => itemKey(it.hotelId, it.roomId) !== itemKey(hotelId, roomId))
        );
    };

    const setQuantity = (hotelId: number, roomId: number, quantity: number) => {
        setItems((current) =>
            current.map((it) =>
                itemKey(it.hotelId, it.roomId) === itemKey(hotelId, roomId)
                    ? { ...it, quantity: Math.max(1, quantity) }
                    : it
            )
        );
    };

    const clear = () => {
        setItems([]);
        clearCartStorage();
    };

    const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);

    return (
        <CartContext.Provider
            value={{ items, totalCount, isInCart, addItem, removeItem, setQuantity, clear }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return ctx;
}
