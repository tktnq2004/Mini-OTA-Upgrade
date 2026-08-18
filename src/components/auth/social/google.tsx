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
        const render = () => {
            if (containerRef.current) {
                window.google.accounts.id.renderButton(containerRef.current, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    text,
                    shape: "rectangular",
                    width: 320,
                });
            }
        };

        if (sdkReady) {
            render();
        } else {
            window.addEventListener("google-sdk-ready", render, { once: true });
        }

        return () => {
            window.removeEventListener("google-sdk-ready", render);
        };
    }, [text]);

    return <div ref={containerRef} style={{ minHeight: 40 }} />;
}
