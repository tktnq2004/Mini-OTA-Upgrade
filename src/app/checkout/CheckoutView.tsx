"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeftIcon,
    BuildingsIcon,
    BedIcon,
    MapPinIcon,
    CreditCardIcon,
    HandCoinsIcon,
    CheckCircleIcon,
    ShoppingBagIcon,
} from "@phosphor-icons/react";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useCart } from "@/components/cart/CartProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ROOM_TYPE_LABELS, formatVnd } from "@/data/rooms.data";
import { addDaysIso, formatDateVn, nightsBetween, todayIso } from "@/lib/searchFilters";
import {
    cartGrandTotal,
    cartLineTotal,
    cartTotalRooms,
    findRoomForItem,
    groupCartItemsByHotel,
} from "@/components/cart/cartUtils";
import type { CartItem } from "@/components/cart/cartStorage";
import controls from "@/styles/controls.module.css";
import styles from "./checkout.module.css";

type PaymentMethod = "payAtHotel" | "card";

export default function CheckoutView() {
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();
    const { items: cartItems, clear: clearCart } = useCart();

    const directHotelId = searchParams.get("hotelId");
    const directRoomId = searchParams.get("roomId");
    const isDirectMode = Boolean(directHotelId && directRoomId);

    // Luồng "Đặt ngay" (1 phòng, từ query string) và luồng giỏ hàng (nhiều
    // phòng, từ CartProvider) cùng đổ về một mảng orderItems — phần hiển thị
    // bên dưới không cần biết đang ở luồng nào.
    const orderItems: CartItem[] = isDirectMode
        ? [
              {
                  hotelId: Number(directHotelId),
                  roomId: directRoomId as string,
                  quantity: 1,
                  checkin: searchParams.get("checkin") || todayIso(),
                  checkout: searchParams.get("checkout") || addDaysIso(todayIso(), 1),
                  guests: Number(searchParams.get("guests")) || 2,
                  addedAt: 0,
              },
          ]
        : cartItems;

    const groups = groupCartItemsByHotel(orderItems);
    const grandTotal = cartGrandTotal(orderItems);
    const totalRooms = cartTotalRooms(orderItems);
    const backHref = isDirectMode ? `/hotel/${directHotelId}` : "/cart";

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("payAtHotel");
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [error, setError] = useState("");
    // Chụp lại số phòng/tổng tiền tại thời điểm đặt — không thể dùng lại
    // totalRooms/grandTotal ở màn hình thành công vì luồng giỏ hàng gọi
    // clearCart() ngay sau đó, khiến chúng bị tính lại về 0.
    const [order, setOrder] = useState<{ code: string; rooms: number; total: number } | null>(null);

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!fullName || !email || !phone) {
            setError(t("checkout.errorRequired"));
            return;
        }
        if (paymentMethod === "card" && (!cardNumber || !cardName || !cardExpiry || !cardCvv)) {
            setError(t("checkout.errorCardRequired"));
            return;
        }

        // TODO(backend): POST /orders — gửi orderItems + thông tin khách +
        // phương thức thanh toán lên server, nhận về mã đơn thật thay cho mã
        // demo sinh ở client bên dưới. Nếu người dùng đã đăng nhập, đây cũng là
        // chỗ gắn userId vào đơn thay vì để guest checkout.
        console.log("Đặt phòng (demo):", {
            fullName,
            email,
            phone,
            note,
            paymentMethod,
            orderItems,
            total: grandTotal,
        });

        if (!isDirectMode) {
            clearCart();
        }
        // handleSubmit chỉ chạy khi submit form (event handler), không phải lúc
        // render — Date.now() ở đây an toàn, không vi phạm yêu cầu "render phải
        // pure" mà rule này nhắm tới.
        // eslint-disable-next-line react-hooks/purity
        const code = `MO-${Date.now().toString(36).toUpperCase()}`;
        setOrder({ code, rooms: totalRooms, total: grandTotal });
    };

    if (order) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.successLayout}>
                    <div className={styles.successCard}>
                        <CheckCircleIcon size={40} weight="fill" className={styles.successIcon} />
                        <h1>{t("checkout.successTitle")}</h1>
                        <p>{t("checkout.successSubtitle", { code: order.code })}</p>
                        <div className={styles.successSummary}>
                            <span>{t("checkout.roomsBooked", { count: order.rooms })}</span>
                            <strong>{formatVnd(order.total)}</strong>
                        </div>
                        <Link href="/" className={controls.button}>
                            {t("checkout.backHome")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className={styles.page}>
                <SiteHeader />
                <div className={styles.layout}>
                    <div className={styles.emptyState}>
                        <ShoppingBagIcon size={32} weight="light" />
                        <p>{t("cart.empty")}</p>
                        <Link href="/" className={controls.button}>
                            {t("cart.emptyCta")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <SiteHeader />

            <div className={styles.layout}>
                <Link href={backHref} className={styles.backLink}>
                    <ArrowLeftIcon size={14} weight="bold" />
                    {isDirectMode ? t("checkout.backToHotel") : t("checkout.backToCart")}
                </Link>

                <h1 className={styles.title}>{t("checkout.title")}</h1>

                <div className={styles.grid}>
                    <form className={styles.formColumn} onSubmit={handleSubmit}>
                        <section className={styles.formSection}>
                            <h2>{t("checkout.customerInfoTitle")}</h2>
                            <p className={styles.sectionHint}>{t("checkout.customerInfoHint")}</p>

                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="co-name">
                                    {t("auth.fullNameLabel")}
                                </label>
                                <input
                                    id="co-name"
                                    type="text"
                                    className={controls.input}
                                    placeholder={t("auth.fullNamePlaceholder")}
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div className={styles.fieldRow}>
                                <div className={controls.field}>
                                    <label className={controls.label} htmlFor="co-email">
                                        Email
                                    </label>
                                    <input
                                        id="co-email"
                                        type="email"
                                        className={controls.input}
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className={controls.field}>
                                    <label className={controls.label} htmlFor="co-phone">
                                        {t("auth.phoneLabel")}
                                    </label>
                                    <input
                                        id="co-phone"
                                        type="tel"
                                        className={controls.input}
                                        placeholder="09xx xxx xxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={controls.field}>
                                <label className={controls.label} htmlFor="co-note">
                                    {t("checkout.noteLabel")}
                                </label>
                                <textarea
                                    id="co-note"
                                    className={controls.textarea}
                                    placeholder={t("checkout.notePlaceholder")}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                        </section>

                        <section className={styles.formSection}>
                            <h2>{t("checkout.paymentTitle")}</h2>

                            <div className={styles.paymentOptions}>
                                <label
                                    className={`${styles.paymentOption} ${paymentMethod === "payAtHotel" ? styles.paymentOptionActive : ""
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        checked={paymentMethod === "payAtHotel"}
                                        onChange={() => setPaymentMethod("payAtHotel")}
                                    />
                                    <HandCoinsIcon size={18} />
                                    <span>{t("checkout.payAtHotel")}</span>
                                </label>
                                <label
                                    className={`${styles.paymentOption} ${paymentMethod === "card" ? styles.paymentOptionActive : ""
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        checked={paymentMethod === "card"}
                                        onChange={() => setPaymentMethod("card")}
                                    />
                                    <CreditCardIcon size={18} />
                                    <span>{t("checkout.payByCard")}</span>
                                </label>
                            </div>

                            {paymentMethod === "card" && (
                                <div className={styles.cardFields}>
                                    <div className={controls.field}>
                                        <label className={controls.label} htmlFor="co-card-number">
                                            {t("checkout.cardNumber")}
                                        </label>
                                        <input
                                            id="co-card-number"
                                            type="text"
                                            inputMode="numeric"
                                            className={controls.input}
                                            placeholder="4242 4242 4242 4242"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                        />
                                    </div>
                                    <div className={controls.field}>
                                        <label className={controls.label} htmlFor="co-card-name">
                                            {t("checkout.cardName")}
                                        </label>
                                        <input
                                            id="co-card-name"
                                            type="text"
                                            className={controls.input}
                                            placeholder="NGUYEN VAN A"
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.fieldRow}>
                                        <div className={controls.field}>
                                            <label className={controls.label} htmlFor="co-card-expiry">
                                                {t("checkout.cardExpiry")}
                                            </label>
                                            <input
                                                id="co-card-expiry"
                                                type="text"
                                                className={controls.input}
                                                placeholder="MM/YY"
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(e.target.value)}
                                            />
                                        </div>
                                        <div className={controls.field}>
                                            <label className={controls.label} htmlFor="co-card-cvv">
                                                CVV
                                            </label>
                                            <input
                                                id="co-card-cvv"
                                                type="text"
                                                inputMode="numeric"
                                                className={controls.input}
                                                placeholder="123"
                                                value={cardCvv}
                                                onChange={(e) => setCardCvv(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {error && <p className={controls.error}>{error}</p>}

                        <button type="submit" className={styles.submitButton}>
                            {t("checkout.submit", { total: formatVnd(grandTotal) })}
                        </button>
                    </form>

                    <aside className={styles.summaryColumn}>
                        <div className={styles.summaryCard}>
                            <h2>{t("checkout.orderSummaryTitle")}</h2>

                            {groups.map(({ hotel, items: hotelItems }) => (
                                <div key={hotel.id} className={styles.summaryHotelGroup}>
                                    <div className={styles.summaryHotelHead}>
                                        <ImageWithFallback
                                            src={hotel.thumbnail}
                                            alt={hotel.name}
                                            className={styles.summaryHotelThumb}
                                            fallbackClassName={styles.summaryHotelThumbFallback}
                                            fallback={<BuildingsIcon size={16} weight="light" />}
                                        />
                                        <div className={styles.summaryHotelText}>
                                            <span className={styles.summaryHotelName}>{hotel.name}</span>
                                            <span className={styles.summaryHotelAddress}>
                                                <MapPinIcon size={11} />
                                                <span>{hotel.address}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {hotelItems.map((item) => {
                                        const room = findRoomForItem(item);
                                        if (!room) return null;
                                        const nights = nightsBetween(item.checkin, item.checkout);
                                        return (
                                            <div key={item.roomId} className={styles.summaryRoomRow}>
                                                <ImageWithFallback
                                                    src={room.thumbnail}
                                                    alt={room.name}
                                                    className={styles.summaryRoomThumb}
                                                    fallbackClassName={styles.summaryRoomThumbFallback}
                                                    fallback={<BedIcon size={14} weight="light" />}
                                                />
                                                <div className={styles.summaryRoomInfo}>
                                                    <span className={styles.summaryRoomName}>
                                                        {ROOM_TYPE_LABELS[room.roomType]} · {room.name}
                                                    </span>
                                                    <span className={styles.summaryRoomMeta}>
                                                        {formatDateVn(item.checkin, language)} –{" "}
                                                        {formatDateVn(item.checkout, language)} ·{" "}
                                                        {t("hotel.nightsSuffix", { count: nights })}
                                                        {item.quantity > 1
                                                            ? ` · ${t("checkout.roomQuantity", { count: item.quantity })}`
                                                            : ""}
                                                    </span>
                                                </div>
                                                <span className={styles.summaryRoomPrice}>
                                                    {formatVnd(cartLineTotal(room, item))}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            <div className={styles.summaryTotalRow}>
                                <span>{t("cart.summaryTotal")}</span>
                                <strong>{formatVnd(grandTotal)}</strong>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
