import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hotels } from "@/data/hotels.data";
import HotelDetail from "./HotelDetail";

interface HotelPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: HotelPageProps): Promise<Metadata> {
    const { id } = await params;
    const hotel = hotels.find((h) => h.id === Number(id));
    return { title: hotel ? `${hotel.name} — WenGo` : "Không tìm thấy khách sạn — WenGo" };
}

export default async function HotelPage({ params }: HotelPageProps) {
    const { id } = await params;
    const hotel = hotels.find((h) => h.id === Number(id));

    if (!hotel) {
        notFound();
    }

    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <HotelDetail hotel={hotel} />
        </Suspense>
    );
}
