"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ImageWithFallbackProps {
    src: string;
    alt: string;
    className?: string;
    fallbackClassName?: string;
    fallback: ReactNode;
    loading?: "lazy" | "eager";
}

export default function ImageWithFallback({
    src,
    alt,
    className,
    fallbackClassName,
    fallback,
    loading = "lazy",
}: ImageWithFallbackProps) {
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Ảnh 404 cục bộ thường phản hồi gần như tức thì, nên trình duyệt có
        // thể đã bắn sự kiện "error" trước khi React hydrate xong và gắn được
        // onError bên dưới — kiểm tra lại ngay khi mount để không bỏ sót.
        const img = imgRef.current;
        setError(Boolean(img && img.complete && img.naturalWidth === 0));
    }, [src]);

    if (error) {
        return <div className={fallbackClassName}>{fallback}</div>;
    }

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={className}
            loading={loading}
            onError={() => setError(true)}
        />
    );
}
