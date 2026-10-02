import { Suspense } from "react";
import ResetPasswordView from "./ResetPasswordView";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <ResetPasswordView />
        </Suspense>
    );
}
