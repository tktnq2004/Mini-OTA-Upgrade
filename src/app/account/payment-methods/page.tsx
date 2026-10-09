import type { Metadata } from "next";
import PaymentMethodsView from "./PaymentMethodsView";

export const metadata: Metadata = {
    title: "Phương thức thanh toán",
    robots: { index: false, follow: false },
};

export default function PaymentMethodsPage() {
    return <PaymentMethodsView />;
}
