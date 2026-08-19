import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hotels } from "@/data/hotels.data";
import { generateRoomsForHotel } from "@/data/rooms.data";
import RoomDetailView from "./RoomDetailView";

interface RoomPageProps {
    params: Promise<{ id: string; roomId: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
    const { id, roomId } = await params;
    const hotel = hotels.find((h) => h.id === Number(id));
    const room = hotel ? generateRoomsForHotel(hotel.id).find((r) => r.id === roomId) : undefined;
    return {
        title: hotel && room ? `${room.name} — ${hotel.name} — WenGo` : "Không tìm thấy phòng — WenGo",
    };
}

export default async function RoomPage({ params }: RoomPageProps) {
    const { id, roomId } = await params;
    const hotel = hotels.find((h) => h.id === Number(id));
    if (!hotel) {
        notFound();
    }

    const room = generateRoomsForHotel(hotel.id).find((r) => r.id === roomId);
    if (!room) {
        notFound();
    }

    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <RoomDetailView hotel={hotel} room={room} />
        </Suspense>
    );
}
