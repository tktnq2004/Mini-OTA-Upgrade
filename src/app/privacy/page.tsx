import type { Metadata } from "next";
import LegalView from "@/components/legal/LegalView";

export const metadata: Metadata = {
    title: "Chính sách quyền riêng tư",
    description: "WenGo thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn như thế nào.",
    alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
    return <LegalView doc="privacy" />;
}
