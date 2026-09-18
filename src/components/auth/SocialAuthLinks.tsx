import { FacebookLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import form from "@/components/auth/AuthForm.module.css";

const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "";

export default function SocialAuthLinks() {
    return (
        <div className={form.socialRow}>
            <a className={form.socialButton} href={`${BACKEND_ORIGIN}/oauth2/authorization/facebook`}>
                <FacebookLogoIcon size={18} weight="fill" />
                Facebook
            </a>
            <a className={form.socialButton} href={`${BACKEND_ORIGIN}/oauth2/authorization/google`}>
                <GoogleLogoIcon size={18} weight="bold" />
                Google
            </a>
        </div>
    );
}
