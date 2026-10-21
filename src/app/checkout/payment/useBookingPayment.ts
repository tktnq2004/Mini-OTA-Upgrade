"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { parseServerDateTime } from "@/lib/format";
import { getBookingStatus, type CreateBookingResult } from "@/lib/booking/resources";
import { PublicApiError } from "@/lib/api/public";
import { syncPayment } from "@/lib/booking/payment";
import { viewStateOf, type ViewState } from "./bookingViewState";

// Sau khi confirm thẻ xong phía Stripe, ở màn processing quá SLOW_AFTER_MS thì
// đổi câu chữ sang "đang mất lâu hơn bình thường" — webhook tới muộn không có
// nghĩa là thất bại. Chỉ là hẹn giờ phía FE, không gọi API.
const SLOW_AFTER_MS = 45_000;

// Đếm ngược theo hạn giữ chỗ THẬT của backend (booking.expirationTime). Quá
// hạn mà còn Pending thì BookingScheduler tự huỷ booking (quét mỗi 30s) và
// nhả phòng — nên hết giờ là ẩn hẳn phần chọn phương thức (kể cả QR SePay,
// để khách không chuyển khoản vào 1 booking sắp bị huỷ), rồi hỏi lại trạng
// thái để chuyển sang màn "đã huỷ" khi backend huỷ xong. Backend có thể huỷ
// trễ tới ~2,5 phút sau hạn (chờ thêm NO_INTENT_GRACE_MINUTES = 2 phút cho độ
// trễ Stripe Search + chu kỳ quét 30s, xem BookingExpirationService) -> hỏi
// lại mỗi 15s trong tối đa 5 phút.
const EXPIRED_RECHECK_MS = 15_000;
const EXPIRED_RECHECK_MAX = 20;

// Sau khi confirm thẻ: gọi POST /payments/{id}/sync, booking chưa chốt
// (Pending/PROCESSING — vd. lượt webhook/cron khác đang giữ lock capture) thì
// gọi lại sau SYNC_INTERVAL_MS, tối đa SYNC_MAX_ATTEMPTS lần (~2 phút). Hết
// lượt vẫn chưa chốt thì đứng ở màn "slow" — webhook/cron backend tự chốt.
const SYNC_INTERVAL_MS = 3_000;
const SYNC_MAX_ATTEMPTS = 40;

interface UseBookingPaymentParams {
    bookingId: number | null;
    email: string;
    // Đang giữa lúc confirm thẻ thì KHÔNG coi là hết hạn: gỡ ô thẻ Stripe giữa
    // chừng làm hỏng lượt confirm; backend cũng hỏi Stripe trước khi huỷ.
    paying: boolean;
}

// Toàn bộ vòng đời trạng thái của trang thanh toán: tải booking, đếm ngược giữ
// chỗ, hỏi lại khi hết hạn, đối soát với backend sau khi confirm thẻ.
export function useBookingPayment({ bookingId, email, paying }: UseBookingPaymentParams) {
    const { t } = useLanguage();
    const [booking, setBooking] = useState<CreateBookingResult | null>(null);
    const [state, setState] = useState<ViewState>("loading");
    const [errorMessage, setErrorMessage] = useState("");
    // true = đang đối soát với backend (vòng gọi sync ở effect 4).
    const [syncing, setSyncing] = useState(false);

    // Lazy initializer — gọi Date.now() thẳng trong thân render bị ESLint
    // react-hooks/purity chặn; effect 2 cập nhật lại mỗi giây.
    const [now, setNow] = useState<number>(() => Date.now());

    // NaN (backend không trả expirationTime) -> không hiện đồng hồ, không khoá.
    const expiresAtMs = parseServerDateTime(booking?.expirationTime);
    const hasDeadline = Number.isFinite(expiresAtMs);
    const remainingMs = expiresAtMs - now;
    const holdExpired = hasDeadline && remainingMs <= 0 && !paying;

    // 1) Tải booking lần đầu.
    useEffect(() => {
        if (!bookingId || !email) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- searchParams tới từ ngoài React, set state ở đây là cách hợp lý nhất để phản ánh lại
            setState("error");
            setErrorMessage(t("checkoutPayment.errorMissingParams"));
            return;
        }

        let alive = true;
        getBookingStatus(bookingId, email)
            .then((result) => {
                if (!alive) return;
                setBooking(result);
                const next = viewStateOf(result.status) ?? "selecting";
                setState(next);
                // Mở lại booking đang PROCESSING (vd. từ "Đặt phòng của tôi")
                // -> đối soát luôn thay vì chỉ đứng chờ.
                if (next === "processing") setSyncing(true);
            })
            .catch((err) => {
                if (!alive) return;
                setState("error");
                setErrorMessage(
                    err instanceof PublicApiError && err.message ? err.message : t("checkoutPayment.errorNotFound")
                );
            });
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bookingId/email đọc 1 lần từ URL lúc mount, không đổi trong vòng đời trang
    }, []);

    // 2) Tick đồng hồ mỗi giây cho đếm ngược — chỉ chạy lúc còn ở màn chọn
    // phương thức (sau đó không còn ý nghĩa hiển thị nữa).
    useEffect(() => {
        if (state !== "selecting") return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [state]);

    // 2b) Hết hạn giữ chỗ khi còn ở màn chọn phương thức: hỏi lại trạng thái
    // vài lần tới khi backend huỷ xong (-> màn "đã huỷ"), hoặc phát hiện đã
    // được trả (vd. webhook SePay về sát giờ -> màn thành công).
    const expiredWhileSelecting = state === "selecting" && holdExpired;
    useEffect(() => {
        if (!expiredWhileSelecting || !bookingId || !email) return;
        let alive = true;
        let attempt = 0;
        const recheck = () => {
            attempt += 1;
            getBookingStatus(bookingId, email)
                .then((result) => {
                    if (!alive) return;
                    setBooking(result);
                    const next = viewStateOf(result.status);
                    if (next) setState(next);
                })
                .catch(() => {
                    // Lỗi mạng tạm thời: bỏ qua, thử lại ở lượt sau.
                });
        };
        recheck();
        const id = setInterval(() => {
            if (attempt >= EXPIRED_RECHECK_MAX) {
                clearInterval(id);
                return;
            }
            recheck();
        }, EXPIRED_RECHECK_MS);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [expiredWhileSelecting, bookingId, email]);

    // 3) Ở màn processing quá lâu thì đổi câu chữ sang "slow" (không gọi API).
    useEffect(() => {
        if (state !== "processing") return;
        const id = setTimeout(() => setState((cur) => (cur === "processing" ? "slow" : cur)), SLOW_AFTER_MS);
        return () => clearTimeout(id);
    }, [state]);

    // 4) Đối soát thanh toán với backend tới khi booking chốt. Màn hình đứng
    // ở "processing"/"slow" suốt lúc gọi; Completed -> "success" (tick xanh
    // + hiệu ứng hoàn tất), Cancelled/hoàn tiền -> màn tương ứng.
    useEffect(() => {
        if (!syncing || !bookingId) return;
        let alive = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let attempt = 0;

        const run = async () => {
            attempt += 1;
            try {
                const result = await syncPayment(bookingId);
                if (!alive) return;
                const next = viewStateOf(result.paymentStatus);
                if (next && next !== "processing") {
                    setBooking((b) => (b ? { ...b, status: result.paymentStatus } : b));
                    setState(next);
                    setSyncing(false);
                    return;
                }
            } catch (err) {
                if (!alive) return;
                // 403/404 (vd. khách vãng lai mất token khi mở tab mới): gọi
                // lại cũng vô ích -> thôi, để webhook/cron backend tự chốt.
                if (err instanceof PublicApiError && (err.status === 403 || err.status === 404)) {
                    setSyncing(false);
                    return;
                }
            }
            if (attempt < SYNC_MAX_ATTEMPTS) timer = setTimeout(run, SYNC_INTERVAL_MS);
            else setSyncing(false);
        };
        void run();

        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [syncing, bookingId]);

    // Stripe.js confirm xong chưa phải "đã trả" — đứng ở "processing" tới khi
    // backend đối soát (sync) báo Completed.
    const startCardSync = () => {
        setState("processing");
        setSyncing(true);
    };

    // Thanh toán tại khách sạn: booking đã Pending sẵn, không có gì để chờ.
    const markPayAtHotelConfirmed = () => setState("success");

    // Áp trạng thái booking mới nhận từ backend lên màn hình. Hiện chưa có gì
    // gọi — sẽ nối với SSE (event đổi trạng thái thanh toán) sau. Pending thì
    // giữ nguyên màn hiện tại (đang chọn phương thức / xem QR / processing).
    const applyBookingStatus = (result: CreateBookingResult) => {
        setBooking(result);
        const next = viewStateOf(result.status);
        if (next) setState(next);
    };

    return {
        booking,
        state,
        errorMessage,
        hasDeadline,
        remainingMs,
        holdExpired,
        startCardSync,
        markPayAtHotelConfirmed,
        applyBookingStatus,
    };
}
