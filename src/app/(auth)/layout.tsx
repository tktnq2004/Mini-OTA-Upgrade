import { SocialAuthScripts } from "@/components/auth/social";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SocialAuthScripts />
            {children}
        </>
    );
}
