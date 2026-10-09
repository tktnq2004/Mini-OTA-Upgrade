import type { Metadata } from "next";
import AccountView from "./AccountView";

export const metadata: Metadata = {
    title: "Tài khoản",
    robots: { index: false, follow: false },
};

export default function AccountPage() {
    return <AccountView />;
}
