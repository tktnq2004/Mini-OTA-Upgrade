"use client";

import { useEffect, useState } from "react";

// Đếm ngược mỗi giây, dừng ở 0 — dùng cho các nút "Gửi lại mã/link" có
// cooldown (OTP đăng ký, đăng nhập bằng mã, quên mật khẩu, đổi mật khẩu...).
// Trả về đúng hình dạng như useState([seconds, setSeconds]) — set 1 số giây
// bất kỳ (cố định hay lấy từ backend, vd. retryAfter) là tự đếm lùi về 0.
// Trước đây mỗi màn hình tự chép lại y hệt cặp useState + useEffect này.
export function useCountdown(): [number, (seconds: number) => void] {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (seconds <= 0) return;
        const id = setInterval(() => setSeconds((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [seconds]);

    return [seconds, setSeconds];
}
