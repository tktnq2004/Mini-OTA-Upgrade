import type { Metadata } from "next";
import LegalView from "@/components/legal/LegalView";

export const metadata: Metadata = {
    title: "Điều khoản dịch vụ",
    description: "Điều khoản sử dụng dịch vụ đặt phòng khách sạn WenGo: tài khoản, đặt phòng, thanh toán, huỷ phòng.",
    alternates: { canonical: "/terms" },
};

export default function TermsPage() {
    return <LegalView doc="terms" />;
}
