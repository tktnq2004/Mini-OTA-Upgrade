import type { Metadata } from "next";
import BookingsView from "./BookingsView";

export const metadata: Metadata = {
    title: "Đặt phòng của tôi",
    robots: { index: false, follow: false },
};

export default function MyBookingsPage() {
    return <BookingsView />;
}
