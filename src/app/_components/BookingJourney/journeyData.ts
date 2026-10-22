// Dữ liệu minh hoạ CỐ ĐỊNH cho section "Đặt phòng chỉ với 4 bước" — section này chỉ mô tả quy
// trình, không phụ thuộc backend (không gọi API, không đổi theo dữ liệu thật) để luôn hiện đầy đủ
// và giống nhau ở mọi lần xem.

export interface JourneyHotel {
    id: number;
    name: string;
    image: string;
    address: string;
    /** Giá/đêm của phòng minh hoạ (pin bản đồ, tổng tiền ở màn thanh toán). */
    price: number;
    /** Tên phòng được đặt — hiện ở màn thanh toán. */
    room?: string;
}

export interface JourneyDestination {
    id: string;
    name: string;
    /** null = không hiện số khách sạn ở dòng gợi ý. */
    hotelCount: number | null;
}

// Số pin trên bản đồ minh hoạ (khớp số toạ độ PIN_POSITIONS ở MapScreen).
export const PIN_COUNT = 5;

// Ảnh đại diện khách sạn trên R2 (cùng nguồn backend dùng cho field `image`).
const thumb = (hotelId: number) => `https://pub-7e93324080a149f4a5099d347ae0fcf3.r2.dev/hotels/${hotelId}/thumbnail.jpg`;

// Chụp lại từ dữ liệu backend thật (GET /hotels, 14/10/2026) — khách sạn ở TP. Hồ Chí Minh, rẻ
// nhất trước. Khách sạn ĐẦU (Hotel Nikko Saigon, id 2) là pin được chọn ở màn bản đồ và là khách
// sạn được đặt ở màn thanh toán / nhận phòng, với phòng rẻ nhất thật của nó (Standard Tầng cao,
// id 17). Giá các khách sạn còn lại = giá phòng thấp nhất thật của từng nơi.
export const JOURNEY_HOTELS: JourneyHotel[] = [
    {
        id: 2,
        name: "Hotel Nikko Saigon",
        address: "235 Nguyen Van Cu, Ho Chi Minh City",
        price: 530_000,
        room: "Standard Tầng cao",
        image: thumb(2),
    },
    { id: 70, name: "Pullman Saigon Centre", address: "148 Tran Hung Dao, Ho Chi Minh City", price: 640_000, image: thumb(70) },
    { id: 4, name: "The Reverie Saigon", address: "22-36 Nguyen Hue, Ho Chi Minh City", price: 730_000, image: thumb(4) },
    { id: 59, name: "Caravelle Saigon", address: "19-23 Lam Son Square, Ho Chi Minh City", price: 800_000, image: thumb(59) },
    { id: 54, name: "Park Hyatt Saigon", address: "2 Lam Son Square, Ho Chi Minh City", price: 810_000, image: thumb(54) },
];

// Gợi ý điểm đến ở màn tìm kiếm — điểm ĐẦU (Hồ Chí Minh) là chữ được "gõ" vào ô tìm kiếm. Số
// khách sạn chụp từ backend thật cùng thời điểm (mã tỉnh theo danh mục 34 tỉnh mới).
export const JOURNEY_DESTINATIONS: JourneyDestination[] = [
    { id: "79", name: "Hồ Chí Minh", hotelCount: 76 },
    { id: "01", name: "Hà Nội", hotelCount: 63 },
    { id: "48", name: "Đà Nẵng", hotelCount: 46 },
    { id: "56", name: "Khánh Hoà", hotelCount: 27 },
];
