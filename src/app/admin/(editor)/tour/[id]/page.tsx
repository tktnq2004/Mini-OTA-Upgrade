import type { Metadata } from "next";
import TourEditor from "@/components/admin/tour/TourEditor";

export const metadata: Metadata = {
    title: "Tour 360° — Mini-OTA Admin",
};

export default async function HotelTourEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TourEditor hotelId={Number(id)} />;
}
