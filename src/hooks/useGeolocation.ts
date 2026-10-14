"use client";

import { useState } from "react";

const NEARBY_ZOOM = 13;
const NEARBY_RADIUS_KM = 10;

interface UseGeolocationOptions {
    t: (key: string) => string;
    // Nhận vị trí GPS thật + bán kính — thường là useHotelFilters.startNearbySearch
    // (gọi endpoint nearby và thay hẳn bộ lọc tỉnh/xã đang chọn).
    onLocate: (lat: number, lng: number, radiusKm: number) => void;
    flyTo: (center: [number, number], zoom: number) => void;
}

// Xử lý nút "Tìm quanh đây": xin quyền định vị rồi báo vị trí GPS thật ra
// ngoài qua onLocate, và bay camera tới đó. Dùng chung cho mọi trang — nếu
// trang không có bản đồ thật (vd. /hotels) thì truyền flyTo: () => {}
// (no-op), phần xin quyền GPS + báo vị trí vẫn hoạt động bình thường.
export function useGeolocation({ t, onLocate, flyTo }: UseGeolocationOptions) {
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState("");

    const requestGeolocation = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                const { latitude, longitude } = position.coords;
                onLocate(latitude, longitude, NEARBY_RADIUS_KM);
                flyTo([longitude, latitude], NEARBY_ZOOM);
            },
            (error: GeolocationPositionError) => {
                setIsLocating(false);
                setGeoError(
                    error.code === error.PERMISSION_DENIED
                        ? t("map.geolocationBlocked")
                        : t("map.geolocationDenied")
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const findNearby = async () => {
        setGeoError("");

        if (!navigator.geolocation) {
            setGeoError(t("map.geolocationUnsupported"));
            return;
        }

        if (!window.isSecureContext) {
            setGeoError(t("map.geolocationInsecureContext"));
            return;
        }

        // Nếu quyền đã bị từ chối từ trước, gọi getCurrentPosition sẽ lỗi
        // ngay lập tức mà KHÔNG hiện lại hộp thoại xin quyền — kiểm tra trước
        // để báo đúng nguyên nhân (cần vào cài đặt trình duyệt tự bật lại)
        // thay vì để người dùng tưởng nút bị lỗi. Safari chưa hỗ trợ query
        // "geolocation" nên bọc try/catch, lỗi thì cứ thử xin như bình thường.
        if (navigator.permissions?.query) {
            try {
                const status = await navigator.permissions.query({ name: "geolocation" });
                if (status.state === "denied") {
                    setGeoError(t("map.geolocationBlocked"));
                    return;
                }
            } catch {
                // bỏ qua, chuyển sang gọi getCurrentPosition trực tiếp bên dưới
            }
        }

        requestGeolocation();
    };

    return { isLocating, geoError, findNearby };
}
