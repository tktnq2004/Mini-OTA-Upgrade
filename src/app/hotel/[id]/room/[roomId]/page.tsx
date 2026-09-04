import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHotelServer, getRoomServer } from "@/lib/hotels/server";
import RoomDetailView from "./RoomDetailView";

interface RoomPageProps {
    params: Promise<{ id: string; roomId: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
    const { id, roomId } = await params;
    const [hotel, room] = await Promise.all([getHotelServer(Number(id)), getRoomServer(Number(roomId))]);
    return {
        title: hotel && room ? `${room.name} — ${hotel.name} — WenGo` : "Không tìm thấy phòng — WenGo",
    };
}

export default async function RoomPage({ params }: RoomPageProps) {
    const { id, roomId } = await params;
    // Gọi song song — Room không mang theo hotelId (JsonIgnore ở backend)
    // nên phải tự lấy hotel riêng từ route param, không suy ra được từ room.
    const [hotel, room] = await Promise.all([getHotelServer(Number(id)), getRoomServer(Number(roomId))]);

    if (!hotel || !room) {
        notFound();
    }

    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <RoomDetailView hotel={hotel} room={room} />
        </Suspense>
    );
}
