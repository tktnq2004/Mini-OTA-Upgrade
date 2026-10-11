import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHotelServer } from "@/lib/hotels/server";
import { getHotelThumbnailServer, getRoomThumbnailsByIds } from "@/lib/media/server";
import HotelDetail from "./HotelDetail";

interface HotelPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: HotelPageProps): Promise<Metadata> {
    const { id } = await params;
    const hotel = await getHotelServer(Number(id));
    if (!hotel) return { title: "Không tìm thấy khách sạn", robots: { index: false } };
    const description = `Đặt phòng ${hotel.name} tại ${hotel.address}. Xem phòng, giá và đặt nhanh trên Trạm OTA.`;
    return {
        title: hotel.name,
        description,
        alternates: { canonical: `/hotel/${hotel.id}` },
        openGraph: {
            title: hotel.name,
            description,
            type: "website",
            images: hotel.image ? [{ url: hotel.image, alt: hotel.name }] : undefined,
        },
    };
}

export default async function HotelPage({ params }: HotelPageProps) {
    const { id } = await params;
    const hotel = await getHotelServer(Number(id));

    if (!hotel) {
        notFound();
    }

    // Ảnh thật (admin upload qua R2) ưu tiên hơn field image/thumbnail cũ —
    // xem HotelDetail/RoomCard: rơi về ảnh cũ nếu hotel/room này chưa có ảnh
    // nào trong media_assets.
    const roomIds = (hotel.rooms ?? []).map((r) => r.id);
    const [coverImage, roomThumbnails] = await Promise.all([
        getHotelThumbnailServer(hotel.id),
        getRoomThumbnailsByIds(roomIds),
    ]);

    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--color-bg)" }} />}>
            <HotelDetail hotel={hotel} coverImage={coverImage} roomThumbnails={roomThumbnails} />
        </Suspense>
    );
}
