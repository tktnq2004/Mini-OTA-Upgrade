"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useAccount } from "@/components/auth/AccountProvider";
import { getMyProfile } from "@/lib/auth/resources";
import { getHotel } from "@/lib/hotels/resources";
import type { Hotel, Room } from "@/lib/hotels/types";
import { getRoomsAvailability, isRangeBookable, type RoomsAvailability } from "@/lib/booking/availability";

// Dữ liệu trang /checkout: khách sạn + các phòng đang đặt, ngày ở + ngày trống,
// thông tin khách (tự điền từ hồ sơ khi đã đăng nhập).
export function useCheckoutData(searchParams: ReadonlyURLSearchParams) {
    // 1 lần đặt = 1 khách sạn + N phòng của khách sạn đó (xem quyết định 3a).
    // Đọc từ query: ?hotelId=..&roomIds=1,2,3  (tương thích ngược: ?roomId=1).
    const hotelId = Number(searchParams.get("hotelId")) || null;
    const roomIds = useMemo(() => {
        const csv = searchParams.get("roomIds");
        const single = searchParams.get("roomId");
        const raw = csv ? csv.split(",") : single ? [single] : [];
        return Array.from(new Set(raw.map(Number).filter((n) => Number.isFinite(n) && n > 0)));
    }, [searchParams]);

    // ----- Khách sạn + phòng -----
    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [loadingHotel, setLoadingHotel] = useState(Boolean(hotelId));

    useEffect(() => {
        if (!hotelId) return;
        let alive = true;
        getHotel(hotelId)
            .then((h) => {
                if (alive) setHotel(h);
            })
            .catch(() => {
                if (alive) setHotel(null);
            })
            .finally(() => {
                if (alive) setLoadingHotel(false);
            });
        return () => {
            alive = false;
        };
    }, [hotelId]);

    const rooms: Room[] = useMemo(() => {
        if (!hotel?.rooms) return [];
        return roomIds
            .map((id) => hotel.rooms!.find((r) => r.id === id))
            .filter((r): r is Room => Boolean(r));
    }, [hotel, roomIds]);

    // ----- Ngày nhận / trả (chọn Ở ĐÂY, không phải ở wishlist) -----
    const [checkIn, setCheckIn] = useState<string | null>(searchParams.get("checkin"));
    const [checkOut, setCheckOut] = useState<string | null>(searchParams.get("checkout"));
    const [availability, setAvailability] = useState<RoomsAvailability>({ disabledDates: [] });
    const [loadingDates, setLoadingDates] = useState(true);

    useEffect(() => {
        if (roomIds.length === 0) return;
        let alive = true;
        // GET /rooms/{id} của từng phòng: đêm đã kín + cửa sổ đặt phòng (min/max).
        getRoomsAvailability(roomIds)
            .then((a) => {
                if (!alive) return;
                setAvailability(a);
                // Ngày điền sẵn từ URL mà đã kín/ngoài cửa sổ thì bỏ, khách chọn lại.
                if (!isRangeBookable(searchParams.get("checkin"), searchParams.get("checkout"), a)) {
                    setCheckIn(null);
                    setCheckOut(null);
                }
            })
            .catch(() => {
                if (alive) setAvailability({ disabledDates: [] });
            })
            .finally(() => {
                if (alive) setLoadingDates(false);
            });
        return () => {
            alive = false;
        };
    }, [roomIds, searchParams]);

    const setDates = (ci: string | null, co: string | null) => {
        setCheckIn(ci);
        setCheckOut(co);
    };

    // ----- Thông tin khách -----
    const { user, ready: accountReady } = useAccount();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Đã đăng nhập (customer) -> tự điền tên/email/sđt từ hồ sơ, đỡ phải gõ
    // lại. SessionUser (useAccount().user) chỉ có id/email/name từ JWT,
    // thiếu phone, nên vẫn phải gọi GET /users/me riêng (getMyProfile) lấy
    // đủ hồ sơ. Chỉ điền vào field còn trống (prev || ...) để không đè chữ
    // khách đã tự gõ nếu profile về chậm hơn; lỗi tải hồ sơ thì bỏ qua, cứ
    // để khách tự điền tay như khách vãng lai.
    useEffect(() => {
        if (!accountReady || !user) return;
        let alive = true;
        getMyProfile()
            .then((profile) => {
                if (!alive) return;
                setFullName((prev) => prev || profile.fullName || "");
                setEmail((prev) => prev || profile.email || "");
                setPhone((prev) => prev || profile.phone || "");
            })
            .catch(() => {
                // Không lấy được hồ sơ thì thôi, không chặn checkout.
            });
        return () => {
            alive = false;
        };
    }, [accountReady, user]);

    return {
        hotelId,
        hotel,
        loadingHotel,
        rooms,
        checkIn,
        checkOut,
        setDates,
        availability,
        loadingDates,
        guest: { fullName, setFullName, email, setEmail, phone, setPhone },
    };
}
