import { FacebookSdkScript, FacebookLoginButton } from "@/components/auth/social/facebook";
import { GoogleSdkScript, GoogleLoginButton } from "@/components/auth/social/google";
import form from "@/components/auth/AuthForm.module.css";

export function SocialAuthScripts() {
    return (
        <>
            {/* Rút ngắn DNS/TLS handshake cho Facebook SDK + popup đăng nhập */}
            <link rel="preconnect" href="https://connect.facebook.net" />
            <link rel="preconnect" href="https://www.facebook.com" crossOrigin="anonymous" />
            <link rel="preconnect" href="https://accounts.google.com" />

            <GoogleSdkScript />
            <FacebookSdkScript />
        </>
    );
}

interface SocialLoginButtonsProps {
    googleText: "signin_with" | "signup_with";
}

export function SocialLoginButtons({ googleText }: SocialLoginButtonsProps) {
    return (
        <div className={form.socialRow}>
            <FacebookLoginButton />
            <GoogleLoginButton text={googleText} />
        </div>
    );
}
