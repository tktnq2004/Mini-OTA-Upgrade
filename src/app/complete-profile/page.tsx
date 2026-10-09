import type { Metadata } from "next";
import { Suspense } from "react";
import CompleteProfileForm from "./CompleteProfileForm";

export const metadata: Metadata = {
    title: "Hoàn tất hồ sơ",
    robots: { index: false, follow: false },
};

export default function CompleteProfilePage() {
    return (
        <Suspense fallback={null}>
            <CompleteProfileForm />
        </Suspense>
    );
}
