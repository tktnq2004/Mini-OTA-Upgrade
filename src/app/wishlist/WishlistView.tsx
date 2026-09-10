"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    HeartIcon,
    BuildingsIcon,
    BedIcon,
    TrashIcon,
    MapPinIcon,
    InfoIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import type { Hotel } from "@/lib/hotels/types";
import {
    findRoom,
    groupWishlistByHotel,
    loadHotelsForWishlist,
} from "@/components/wishlist/wishlistUtils";
import controls from "@/styles/controls.module.css";
import styles from "./wishlist.module.css";

export default function WishlistView() {
    const { t } = useLanguage();
    const router = useRouter();
    const { items, remove } = useWishlist();

    const [hotelsById, setHotelsById] = useState<Map<number, Hotel>>(new Map());
    const [loading, setLoading] = useState(true);
    // roomId đã tick để chuẩn bị đặt. Theo quyết định 3a: chỉ cho chọn các
    // phòng CÙNG 1 khách sạn trong một lần đặt.
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const itemsKey = items.map((i) => `${i.hotelId}:${i.roomId}`).join(",");

    const loadHotels = () => {
        setLoading(true);
        loadHotelsForWishlist(items)
            .then(setHotelsById)
            .finally(() => setLoading(false));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(loadHotels, [itemsKey]); // eslint-disable-line react-hooks/set-state-in-effect -- tải hotel/room từ API theo wishlist hiện tại

    const groups = groupWishlistByHotel(items, hotelsById);

    // roomId đã bị bỏ khỏi wishlist mà vẫn còn trong `selected` là vô hại:
    // selectedHotelId / bookHotel đều lọc lại theo `groups` nên không dùng tới
    // id "chết" — không cần effect dọn.

    // Khách sạn đang "khoá" vùng chọn — suy ra từ phòng đã tick (chỉ tính các
    // phòng còn tồn tại thật).
    const selectedHotelId = useMemo(() => {
        for (const g of groups) {
            const hit = g.items.some(
                (it) => selected.has(it.roomId) && findRoom(it.hotelId, it.roomId, hotelsById)
            );
            if (hit) return g.hotel.id;
        }
        return null;
    }, [groups, selected, hotelsById]);

    const toggleRoom = (roomId: number) => {
        setSelected((cur) => {
            const next = new Set(cur);
            if (next.has(roomId)) next.delete(roomId);
            else next.add(roomId);
            return next;
        });
    };

    const bookHotel = (hotelId: number) => {
        const roomIds = groups
            .find((g) => g.hotel.id === hotelId)
            ?.items.filter((it) => selected.has(it.roomId))
            .map((it) => it.roomId);
        if (!roomIds || roomIds.length === 0) return;
        const params = new URLSearchParams({
            hotelId: String(hotelId),
            roomIds: roomIds.join(","),
        });
        router.push(`/checkout?${params.toString()}`);
    };

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <div className={styles.header}>
                    <h1>{t("wishlist.title")}</h1>
                    <p>{t("wishlist.subtitle")}</p>
                </div>

                {loading ? (
                    <p className={styles.emptyState}>{t("wishlist.loading")}</p>
                ) : groups.length === 0 ? (
                    <div className={styles.emptyState}>
                        <HeartIcon size={32} weight="light" />
                        <p>{t("wishlist.empty")}</p>
                        <Link href="/" className={controls.button}>
                            {t("wishlist.emptyCta")}
                        </Link>
                    </div>
                ) : (
                    <>
                        {selectedHotelId !== null && (
                            <p className={styles.lockHint}>
                                <InfoIcon size={14} weight="bold" />
                                {t("wishlist.oneHotelHint")}
                            </p>
                        )}

                        <div className={styles.groups}>
                            {groups.map(({ hotel, items: hotelItems }) => {
                                // Bỏ qua các dòng trỏ tới phòng không còn tồn tại
                                // (đã bị xoá) — cả nhóm rỗng thì ẩn luôn.
                                const rows = hotelItems.filter((it) =>
                                    findRoom(it.hotelId, it.roomId, hotelsById)
                                );
                                if (rows.length === 0) return null;

                                const locked =
                                    selectedHotelId !== null && selectedHotelId !== hotel.id;
                                const pickedInHotel = rows.filter((it) =>
                                    selected.has(it.roomId)
                                ).length;

                                return (
                                    <section
                                        key={hotel.id}
                                        className={`${styles.hotelGroup} ${locked ? styles.hotelGroupLocked : ""}`}
                                    >
                                        <div className={styles.hotelHead}>
                                            <ImageWithFallback
                                                src={hotel.image}
                                                alt={hotel.name}
                                                className={styles.hotelThumb}
                                                fallbackClassName={styles.hotelThumbFallback}
                                                fallback={<BuildingsIcon size={20} weight="light" />}
                                            />
                                            <div className={styles.hotelInfo}>
                                                <h2>{hotel.name}</h2>
                                                <p>
                                                    <MapPinIcon size={12} />
                                                    <span>{hotel.address}</span>
                                                </p>
                                            </div>
                                            <Link
                                                href={`/hotel/${hotel.id}`}
                                                className={styles.viewHotelLink}
                                            >
                                                {t("wishlist.viewHotel")}
                                            </Link>
                                        </div>

                                        <ul className={styles.roomList}>
                                            {rows.map((item) => {
                                                const room = findRoom(
                                                    item.hotelId,
                                                    item.roomId,
                                                    hotelsById
                                                );
                                                if (!room) return null;
                                                const checked = selected.has(item.roomId);

                                                return (
                                                    <li key={item.roomId} className={styles.roomRow}>
                                                        <label className={styles.checkWrap}>
                                                            <input
                                                                type="checkbox"
                                                                className={styles.check}
                                                                checked={checked}
                                                                disabled={locked}
                                                                onChange={() => toggleRoom(item.roomId)}
                                                                aria-label={t("wishlist.selectRoomAria", {
                                                                    name: room.name,
                                                                })}
                                                            />
                                                        </label>

                                                        <ImageWithFallback
                                                            src={room.thumbnail}
                                                            alt={room.name}
                                                            className={styles.roomThumb}
                                                            fallbackClassName={styles.roomThumbFallback}
                                                            fallback={<BedIcon size={18} weight="light" />}
                                                        />

                                                        <div className={styles.roomInfo}>
                                                            {room.roomType && (
                                                                <span className={styles.roomType}>
                                                                    {room.roomType.roomTypeName}
                                                                </span>
                                                            )}
                                                            <span className={styles.roomName}>{room.name}</span>
                                                        </div>

                                                        <div className={styles.roomPrice}>
                                                            {formatVnd(room.price)}
                                                            <span>{t("room.perNight")}</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className={styles.removeButton}
                                                            onClick={() => remove(item.hotelId, item.roomId)}
                                                            aria-label={t("wishlist.remove")}
                                                        >
                                                            <TrashIcon size={15} />
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        <div className={styles.groupFooter}>
                                            <span className={styles.groupCount}>
                                                {pickedInHotel > 0
                                                    ? t("wishlist.roomsPicked", { count: pickedInHotel })
                                                    : t("wishlist.pickToBook")}
                                            </span>
                                            <button
                                                type="button"
                                                className={controls.button}
                                                disabled={pickedInHotel === 0}
                                                onClick={() => bookHotel(hotel.id)}
                                            >
                                                {t("wishlist.bookThisHotel")}
                                            </button>
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
