"use client";

import { useEffect, useRef } from "react";

const FB_APP_ID = "2840631646312811";
const GOOGLE_CLIENT_ID = "654051365578-akou0ga1q1dh34o8a0oiqhvpu47b4fsj.apps.googleusercontent.com";

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

// Dùng chung cho Login/Signup — khởi tạo FB SDK + Google Identity Services
// một lần, expose 2 hàm bấm nút để trigger popup đăng nhập của từng bên.
export function useSocialAuth() {
    const googleClientRef = useRef<GoogleTokenClient | null>(null);
    const googleCallbackRef = useRef<((response: GoogleTokenResponse) => void) | null>(null);

    useEffect(() => {
        let cancelled = false;

        const initFacebook = () => {
            if (cancelled) return;
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
