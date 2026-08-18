"use client";

import Script from "next/script";
import { FacebookLogoIcon } from "@phosphor-icons/react";
import styles from "./facebook.module.css";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

interface FacebookLoginResponse {
    status?: string;
    authResponse: { accessToken: string; userID: string } | null;
}

export function FacebookSdkScript() {
    return (
        <Script
            src="https://connect.facebook.net/en_US/sdk.js"
            strategy="afterInteractive"
            onReady={() => {
                if (!FB_APP_ID) {
                    console.warn("NEXT_PUBLIC_FACEBOOK_APP_ID chưa được cấu hình trong .env.local");
                    return;
                }
                window.FB.init({
                    appId: FB_APP_ID,
                    cookie: true,
                    xfbml: false,
                    version: "v23.0",
                });
            }}
        />
    );
}

export function FacebookLoginButton() {
    const handleClick = () => {
        if (!window.FB) {
            console.warn("Facebook SDK chưa sẵn sàng");
            return;
        }
        window.FB.login(
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

    return (
        <button type="button" className={styles.button} onClick={handleClick}>
            <FacebookLogoIcon size={18} weight="fill" />
            Facebook
        </button>
    );
}
