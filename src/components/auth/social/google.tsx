"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
    credential?: string;
}

let sdkReady = false;

function markSdkReady() {
    sdkReady = true;
    window.dispatchEvent(new Event("google-sdk-ready"));
}

export function GoogleSdkScript() {
    return (
        <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onReady={() => {
                if (!GOOGLE_CLIENT_ID) {
                    console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID chưa được cấu hình trong .env.local");
                    return;
                }
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: GoogleCredentialResponse) => {
                        if (response.credential) {
                            console.log("Google login success", response.credential);
                        } else {
                            console.log("Google login failed");
                        }
                    },
                });
                markSdkReady();
            }}
        />
    );
}

interface GoogleLoginButtonProps {
    text: "signin_with" | "signup_with";
}

export function GoogleLoginButton({ text }: GoogleLoginButtonProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // GIS renderButton chỉ nhận width theo pixel cố định, không hỗ trợ "100%",
        // nên phải đo chiều rộng container thực tế và vẽ lại mỗi khi nó đổi.
        const render = () => {
            if (!sdkReady) return;
            const width = Math.round(container.getBoundingClientRect().width);
            if (width <= 0) return;
            window.google.accounts.id.renderButton(container, {
                type: "standard",
                theme: "outline",
                size: "large",
                text,
                shape: "rectangular",
                width,
            });
        };

        if (sdkReady) {
            render();
        } else {
            window.addEventListener("google-sdk-ready", render, { once: true });
        }

        const resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(container);

        return () => {
            window.removeEventListener("google-sdk-ready", render);
            resizeObserver.disconnect();
        };
    }, [text]);

    return <div ref={containerRef} style={{ minHeight: 40, width: "100%" }} />;
}
