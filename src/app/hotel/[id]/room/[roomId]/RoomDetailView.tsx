"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeftIcon,
    MapPinIcon,
    UsersIcon,
    CheckIcon,
    ClockIcon,
    ShieldCheckIcon,
    IdentificationCardIcon,
    ProhibitIcon,
    BuildingsIcon,
    BedIcon,
    ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import type { Hotel, Room } from "@/lib/hotels/types";
import type { MediaAsset } from "@/lib/media/types";
import { formatVnd } from "@/lib/format";
import { nightsBetween, parseFilters } from "@/lib/searchFilters";
import { isRangeBookable, mergeAvailability } from "@/lib/booking/availability";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import GuestsField from "@/components/GuestsField/GuestsField";
import DateRangeField from "@/components/DateRangePicker/DateRangeField";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { getPanoramaTourForHotel } from "@/components/panorama/panoramaTours.data";
import PanoramaViewerModal from "@/components/panorama/PanoramaViewerModal";
import RoomCard from "../../RoomCard";
import controls from "@/styles/controls.module.css";
import styles from "./RoomDetail.module.css";

interface RoomDetailViewProps {
    hotel: Hotel;
    room: Room;
    // Ảnh thumbnail + panorama THẬT của CHÍNH room này từ module media (R2)
    // — cả 2 đều undefined/rỗng thì rơi về room.thumbnail/images cũ (xem
    // gallery bên dưới).
    thumbnail?: string;
    panorama: MediaAsset[];
    // Ảnh thumbnail của các room khác (mục "phòng khác"), keyed theo room id.
    roomThumbnails: Record<number, string | undefined>;
}

export default function RoomDetailView({ hotel, room, thumbnail, panorama, roomThumbnails }: RoomDetailViewProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isSaved, add, remove } = useWishlist();

    // Chỉ đọc query string một lần lúc vào trang để khởi tạo ngày/số khách —
    // sau đó người dùng tự điều chỉnh ngay tại đây (giống HotelDetail).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const initial = useMemo(() => parseFilters(searchParams), []);

    // Ngày kín + cửa sổ đặt phòng do GET /rooms/{id} trả sẵn trong `room`.
    const availability = useMemo(() => mergeAvailability([room]), [room]);

    // Ngày điền sẵn từ tìm kiếm chỉ giữ nếu còn đặt được — đã kín / ngoài cửa
    // sổ đặt thì để trống cho khách tự chọn trên lịch.
    const [checkin, setCheckin] = useState<string | null>(() =>
        isRangeBookable(initial.checkin, initial.checkout, availability) ? initial.checkin : null
    );
    const [checkout, setCheckout] = useState<string | null>(() =>
        isRangeBookable(initial.checkin, initial.checkout, availability) ? initial.checkout : null
    );
    const [guests, setGuests] = useState(() => Math.min(initial.guests, room.capacity));
    const [activePhoto, setActivePhoto] = useState(0);
    const [showPanorama, setShowPanorama] = useState(false);

    // Chỉ 2 khách sạn demo có ảnh 360° thật (không thể sinh hàng loạt như ảnh
    // 2D mock khác) nên nút "Xem Panorama 360°" chỉ hiện đúng ở đó.
    const panoramaTour = getPanoramaTourForHotel(hotel.id);

    // Ưu tiên ảnh thật từ module media (R2, do admin upload): thumbnail trước
    // rồi tới các ảnh panorama (panorama vẫn xem được như ảnh thường trong
    // gallery 2D này — xem 360° tương tác là tính năng riêng, xem
    // panoramaTour bên dưới). Chỉ rơi về room.thumbnail/images cũ khi room
    // này CHƯA có thumbnail nào trong media_assets.
    const gallery = useMemo(() => {
        if (thumbnail) return [thumbnail, ...panorama.map((p) => p.url)];
        return room.images.length > 0 ? [room.thumbnail, ...room.images.map((img) => img.image)] : [room.thumbnail];
    }, [thumbnail, panorama, room]);
    const otherRooms = useMemo(
        () => (hotel.rooms ?? []).filter((r) => r.id !== room.id).slice(0, 4),
        [hotel.rooms, room.id]
    );

    const nights = checkin && checkout ? nightsBetween(checkin, checkout) : 0;
    const total = room.price * nights;
    const canBook = Boolean(checkin && checkout);
    const selected = isSaved(hotel.id, room.id);
    const hotelHref = `/hotel/${hotel.id}?${searchParams.toString()}`;

    const toggleWishlist = () => {
        if (selected) {
            remove(hotel.id, room.id);
        } else {
            add(hotel.id, room.id);
        }
    };

    const bookNow = () => {
        if (!checkin || !checkout) return;
        // Ngày/số khách chỉ là gợi ý điền sẵn — chốt lại ở /checkout (có picker
        // biết ngày đã kín). from=hotel để nút "Quay lại" về đúng trang này.
        const params = new URLSearchParams({
            hotelId: String(hotel.id),
            roomIds: String(room.id),
            from: "hotel",
            checkin,
            checkout,
            guests: String(guests),
        });
        router.push(`/checkout?${params.toString()}`);
    };

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <Link href={hotelHref} className={styles.backLink}>
                    <ArrowLeftIcon size={14} weight="bold" /> {t("room.detail.backToHotel")}
                </Link>

                <div className={styles.mainColumn}>
                    <div className={styles.gallery}>
                        <div className={styles.heroWrap}>
                            <ImageWithFallback
                                src={gallery[activePhoto]}
                                alt={room.name}
                                className={styles.hero}
                                fallbackClassName={styles.heroFallback}
                                fallback={<BedIcon size={32} weight="light" />}
                                loading="eager"
                            />
                            {panoramaTour && (
                                <button
                                    type="button"
                                    className={styles.panoramaButton}
                                    onClick={() => setShowPanorama(true)}
                                >
                                    <ArrowsClockwiseIcon size={15} weight="bold" />
                                    {t("room.detail.viewPanorama")}
                                </button>
                            )}
                        </div>
                        {gallery.length > 1 && (
                            <div className={styles.thumbRow}>
                                {gallery.map((src, i) => (
                                    <button
                                        key={src}
                                        type="button"
                                        className={i === activePhoto ? styles.thumbBtnActive : styles.thumbBtn}
                                        onClick={() => setActivePhoto(i)}
                                        aria-label={`${t("room.detail.photoAria")} ${i + 1}`}
                                    >
                                        <ImageWithFallback
                                            src={src}
                                            alt=""
                                            className={styles.thumbImg}
                                            fallbackClassName={styles.thumbImgFallback}
                                            fallback={<BedIcon size={14} weight="light" />}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.titleBlock}>
                        {room.roomType && <span className={styles.typeBadge}>{room.roomType.roomTypeName}</span>}
                        <h1 className={styles.title}>{room.name}</h1>
                        <Link href={hotelHref} className={styles.hotelLink}>
                            <BuildingsIcon size={14} /> {hotel.name}
                        </Link>
                        <p className={styles.address}>
                            <MapPinIcon size={13} />
                            <span>{hotel.address}</span>
                        </p>
                        <div className={styles.metaRow}>
                            <span className={styles.metaItem}>
                                <UsersIcon size={15} /> {t("room.maxGuests", { count: room.capacity })}
                            </span>
                        </div>
                    </div>

                    <section className={styles.section}>
                        <h2>{t("room.detail.descriptionTitle")}</h2>
                        <p className={styles.description}>{room.description}</p>
                    </section>

                    <section className={styles.section}>
                        <h2>{t("room.detail.amenitiesTitle")}</h2>
                        <div className={styles.amenitiesGrid}>
                            {room.amenities.map((a) => (
                                <span key={a.id} className={styles.amenityItem}>
                                    <CheckIcon size={13} weight="bold" />
                                    {a.name}
                                </span>
                            ))}
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2>{t("room.detail.policiesTitle")}</h2>
                        <ul className={styles.policyList}>
                            <li>
                                <ClockIcon size={15} /> {t("room.detail.policyCheckin")}
                            </li>
                            <li>
                                <ClockIcon size={15} /> {t("room.detail.policyCheckout")}
                            </li>
                            <li>
                                <ShieldCheckIcon size={15} /> {t("room.detail.policyCancellation")}
                            </li>
                            <li>
                                <IdentificationCardIcon size={15} /> {t("room.detail.policyId")}
                            </li>
                            <li>
                                <ProhibitIcon size={15} /> {t("room.detail.policySmoking")}
                            </li>
                        </ul>
                    </section>

                    {otherRooms.length > 0 && (
                        <section className={styles.section}>
                            <h2>{t("room.detail.otherRoomsTitle")}</h2>
                            <div className={styles.otherRoomsGrid}>
                                {otherRooms.map((r) => (
                                    <RoomCard
                                        key={r.id}
                                        hotelId={hotel.id}
                                        room={r}
                                        coverImage={roomThumbnails[r.id]}
                                        nights={nights || 1}
                                        checkin={checkin ?? ""}
                                        checkout={checkout ?? ""}
                                        guests={guests}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <aside className={styles.bookingColumn}>
                    <div className={styles.bookingCard}>
                        <div className={styles.priceHead}>
                            <strong>{formatVnd(room.price)}</strong>
                            <span>{t("room.perNight")}</span>
                        </div>

                        <div className={controls.field}>
                            <DateRangeField
                                alwaysOpen
                                checkIn={checkin}
                                checkOut={checkout}
                                onChange={(ci, co) => {
                                    setCheckin(ci);
                                    setCheckout(co);
                                }}
                                disabledDates={availability.disabledDates}
                                minDate={availability.minDate}
                                maxDate={availability.maxDate}
                            />
                        </div>
                        <GuestsField value={guests} onChange={setGuests} max={room.capacity} />

                        <div className={styles.priceBreakdown}>
                            <span>{t("wishlist.summaryTotal")}</span>
                            <strong>{nights > 0 ? formatVnd(total) : t("checkout.pickDatesForTotal")}</strong>
                        </div>

                        <div className={styles.bookingActions}>
                            <button
                                type="button"
                                className={selected ? styles.selectButtonActive : styles.selectButton}
                                onClick={toggleWishlist}
                            >
                                {selected && <CheckIcon size={13} weight="bold" />}
                                {selected ? t("room.savedToWishlist") : t("room.saveToWishlist")}
                            </button>
                            <button type="button" className={styles.bookNowButton} onClick={bookNow} disabled={!canBook}>
                                {t("room.bookNow")}
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {showPanorama && panoramaTour && (
                <PanoramaViewerModal
                    tour={panoramaTour}
                    hotelName={hotel.name}
                    onClose={() => setShowPanorama(false)}
                />
            )}
        </div>
    );
}
