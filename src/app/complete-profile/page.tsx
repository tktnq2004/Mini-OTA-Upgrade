import { Suspense } from "react";
import CompleteProfileForm from "./CompleteProfileForm";

export default function CompleteProfilePage() {
    return (
        <Suspense fallback={null}>
            <CompleteProfileForm />
        </Suspense>
    );
}
