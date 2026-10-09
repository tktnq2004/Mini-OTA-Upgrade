import type { Metadata } from "next";
import WishlistView from "./WishlistView";

export const metadata: Metadata = {
    title: "Phòng đã lưu",
    robots: { index: false, follow: false },
};

export default function WishlistPage() {
    return <WishlistView />;
}
