import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordView from "./ResetPasswordView";

export const metadata: Metadata = {
    title: "Đặt lại mật khẩu",
    robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <ResetPasswordView />
        </Suspense>
    );
}
