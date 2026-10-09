import { GoogleLogoIcon } from "@phosphor-icons/react";
import form from "@/components/auth/AuthForm.module.css";

const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "";

export default function GoogleAuthLink() {
    return (
        <div className={form.socialRow}>
            <a className={form.socialButton} href={`${BACKEND_ORIGIN}/oauth2/authorization/google`}>
                <GoogleLogoIcon size={18} weight="bold" />
                Google
            </a>
        </div>
    );
}
