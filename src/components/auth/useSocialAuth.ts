"use client";

import { useEffect, useRef } from "react";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface FacebookLoginResponse {
    status?: string;
    authResponse: { accessToken: string; userID: string } | null;
}

interface GoogleTokenResponse {
    access_token?: string;
    error?: string;
}

interface GoogleTokenError {
    type?: string;
    message?: string;
}

interface GoogleTokenClient {
    requestAccessToken: () => void;
}

export function useSocialAuth() {
    const googleClientRef = useRef<GoogleTokenClient | null>(null);
    const googleCallbackRef = useRef<((response: GoogleTokenResponse) => void) | null>(null);

    useEffect(() => {
        let cancelled = false;

        const initFacebook = () => {
            if (cancelled) return;
            if (!FB_APP_ID) {
                console.warn("NEXT_PUBLIC_FACEBOOK_APP_ID chưa được cấu hình trong .env.local");
                return;
            }
            if (!window.FB) {
                setTimeout(initFacebook, 500);
                return;
            }
            window.FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: "v23.0",
            });
        };

        const initGoogle = () => {
            if (cancelled) return;
            if (!GOOGLE_CLIENT_ID) {
                console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID chưa được cấu hình trong .env.local");
                return;
            }
            if (!window.google) {
                setTimeout(initGoogle, 500);
                return;
            }
            googleClientRef.current = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: "profile email",
                callback: (response: GoogleTokenResponse) => {
                    googleCallbackRef.current?.(response);
                },
                error_callback: (error: GoogleTokenError) => {
                    console.log("Google login failed", error);
                },
            });
        };

        initFacebook();
        initGoogle();

        return () => {
            cancelled = true;
        };
    }, []);

    const loginFacebook = () => {
        window.FB?.login(
            (response: FacebookLoginResponse) => {
                if (response.authResponse) {
                    console.log("Facebook login success", response.authResponse.accessToken);
                } else {
                    console.log("Facebook login failed");
                }
            },
            { scope: "public_profile" }
        );
    };

    const loginGoogle = () => {
        googleCallbackRef.current = (response: GoogleTokenResponse) => {
            if (response.access_token) {
                console.log("Google login success", response.access_token);
            } else {
                console.log("Google login failed");
            }
        };
        googleClientRef.current?.requestAccessToken();
    };

    return { loginFacebook, loginGoogle };
}
