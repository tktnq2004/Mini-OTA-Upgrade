import type { PanoramaTour } from "./types";

// 2 tour 360° port từ dữ liệu thật của dự án PanoraStay (React Native) —
// toạ độ hotspot [x,y,z] đã được hiệu chỉnh thủ công khớp từng ảnh gốc nên
// giữ nguyên. Chỉ dịch tên/mô tả hotspot sang tiếng Việt (khớp quy ước nội
// dung mock của MiniOTA) và chỉnh vài mô tả gắn địa danh cụ thể (view biển,
// hồ...) cho khớp với khách sạn MiniOTA mà tour được gắn vào bên dưới.
//
// Vì chỉ có 2 bộ ảnh 360° thật (không thể sinh hàng loạt như ảnh 2D mock
// khác), tính năng chỉ hiển thị ở đúng 2 khách sạn được gắn tour, không phải
// mọi khách sạn.
export const PANORAMA_TOURS: PanoramaTour[] = [
    {
        id: "hotel_tour",
        hotelId: 1, // Sofitel Legend Metropole Hanoi
        scenes: [
            {
                id: "hallway",
                name: "Hành lang",
                imageUrl: "/hotel/hallway_room.jpg",
                hotspots: [
                    {
                        id: "hs_hall_to_room101",
                        type: "NAVIGATION",
                        name: "Phòng 101",
                        targetSceneId: "main_room_101",
                        position: [12, 0.3, 16],
                    },
                    {
                        id: "hs_hall_to_room102",
                        type: "NAVIGATION",
                        name: "Phòng 102",
                        targetSceneId: "main_room_102",
                        position: [-12, 0.3, -16],
                    },
                    {
                        id: "hs_hall_info_elevator",
                        type: "INFO",
                        name: "Thang máy",
                        description: "Thang máy để di chuyển giữa các tầng khách sạn, nằm ngay hành lang.",
                        position: [16, 0, -12],
                    },
                ],
            },
            {
                id: "main_room_101",
                name: "Phòng chính 101",
                imageUrl: "/hotel/101/main_room.jpg",
                hotspots: [
                    {
                        id: "hs_main_to_hall",
                        type: "NAVIGATION",
                        name: "Hành lang",
                        targetSceneId: "hallway",
                        position: [19.3, -2.3, -4.8],
                    },
                    {
                        id: "hs_main_to_bath",
                        type: "NAVIGATION",
                        name: "Phòng tắm",
                        targetSceneId: "bath_room_101",
                        position: [18, -2.9, -8.2],
                    },
                    {
                        id: "hs_main_view_window_info",
                        type: "INFO",
                        name: "Tầm nhìn Hồ Gươm",
                        description: "Tầm nhìn ra Hồ Gươm và phố cổ Hà Nội, đẹp nhất lúc hoàng hôn.",
                        position: [1.2, -3.4, 19.7],
                    },
                ],
            },
            {
                id: "bath_room_101",
                name: "Phòng tắm 101",
                imageUrl: "/hotel/101/bath_room.jpg",
                hotspots: [
                    {
                        id: "hs_bath_b_to_main",
                        type: "NAVIGATION",
                        name: "Phòng chính",
                        targetSceneId: "main_room_101",
                        position: [19.5, -0.4, -4.3],
                    },
                    {
                        id: "hs_bath_info_tub",
                        type: "INFO",
                        name: "Bồn tắm đá cẩm thạch",
                        description: "Bồn tắm đá cẩm thạch, hoàn hảo cho một lần ngâm mình thư giãn sau ngày dài.",
                        position: [13.9, -7.3, -12.3],
                    },
                    {
                        id: "hs_bath_info_shower",
                        type: "INFO",
                        name: "Vòi sen mưa",
                        description: "Vòi sen mưa với áp lực và nhiệt độ nước điều chỉnh được, mang lại trải nghiệm sảng khoái.",
                        position: [-12.9, 14.1, 5.9],
                    },
                ],
            },
            {
                id: "main_room_102",
                name: "Phòng chính 102",
                imageUrl: "/hotel/102/main_room.jpg",
                hotspots: [
                    {
                        id: "hs_main2_to_hall",
                        type: "NAVIGATION",
                        name: "Hành lang",
                        targetSceneId: "hallway",
                        position: [12.8, -0.5, -15.4],
                    },
                    {
                        id: "hs_main2_to_bath",
                        type: "NAVIGATION",
                        name: "Phòng tắm",
                        targetSceneId: "bath_room_102",
                        position: [15, 0.4, 13.2],
                    },
                    {
                        id: "hs_main2_to_bed",
                        type: "NAVIGATION",
                        name: "Phòng ngủ",
                        targetSceneId: "bed_room",
                        position: [-16.9, -0.1, -10.8],
                    },
                ],
            },
            {
                id: "bath_room_102",
                name: "Phòng tắm 102",
                imageUrl: "/hotel/102/bath_room.jpg",
                hotspots: [
                    {
                        id: "hs_bath2_to_main",
                        type: "NAVIGATION",
                        name: "Phòng chính",
                        targetSceneId: "main_room_102",
                        position: [-0.2, -0.1, -20],
                    },
                    {
                        id: "hs_bath2_info_tub",
                        type: "INFO",
                        name: "Bồn tắm & vòi sen",
                        description: "Bồn tắm hiện đại kèm khu vực vòi sen riêng, mang lại trải nghiệm tắm sang trọng.",
                        position: [-19.4, -1.7, 4.7],
                    },
                    {
                        id: "hs_bath2_info_sink",
                        type: "INFO",
                        name: "Bồn rửa & gương",
                        description: "Bồn rửa sang trọng với gương lớn, hoàn hảo cho việc chăm sóc cá nhân hàng ngày.",
                        position: [1.3, 5, 19.3],
                    },
                ],
            },
            {
                id: "bed_room",
                name: "Phòng ngủ",
                imageUrl: "/hotel/102/bed_room.jpg",
                hotspots: [
                    {
                        id: "hs_bedroom_to_main",
                        type: "NAVIGATION",
                        name: "Phòng chính",
                        targetSceneId: "main_room_102",
                        position: [-15.2, -1.5, 12.9],
                    },
                    {
                        id: "hs_bedroom_info_tv",
                        type: "INFO",
                        name: "TV 4K",
                        description: "TV 4K cùng Netflix miễn phí phục vụ giải trí.",
                        position: [-2.8, -3.3, -19.5],
                    },
                    {
                        id: "hs_bedroom_info_city",
                        type: "INFO",
                        name: "Tầm nhìn thành phố",
                        description: "Tầm nhìn toàn cảnh thành phố Hà Nội, hoàn hảo để ngắm hoàng hôn và ánh đèn phố đêm.",
                        position: [18.8, 6.7, -0.9],
                    },
                ],
            },
        ],
    },
    {
        id: "resort_tour",
        hotelId: 11, // Vinpearl Resort & Spa Phu Quoc
        scenes: [
            {
                id: "living_room",
                name: "Phòng khách",
                imageUrl: "/resort/living_room.jpg",
                hotspots: [
                    {
                        id: "hs_living_to_bedroom_1",
                        type: "NAVIGATION",
                        name: "Phòng ngủ 1",
                        targetSceneId: "bed_room_1",
                        position: [-15.9, -1.4, 12.1],
                    },
                    {
                        id: "hs_living_to_kitchen",
                        type: "NAVIGATION",
                        name: "Bếp & phòng ăn",
                        targetSceneId: "kitchen_dining",
                        position: [-1.7, -0.8, -19.9],
                    },
                    {
                        id: "hs_living_to_entertainment",
                        type: "NAVIGATION",
                        name: "Phòng giải trí",
                        targetSceneId: "entertainment_room",
                        position: [6, -0.1, 19.1],
                    },
                    {
                        id: "hs_living_to_bedroom_2",
                        type: "NAVIGATION",
                        name: "Phòng ngủ 2",
                        targetSceneId: "bed_room_2",
                        position: [19, -0.7, 6.1],
                    },
                ],
            },
            {
                id: "bed_room_1",
                name: "Phòng ngủ 1",
                imageUrl: "/resort/bed_room_1.jpg",
                hotspots: [
                    {
                        id: "hs_bed1_to_living",
                        type: "NAVIGATION",
                        name: "Phòng khách",
                        targetSceneId: "living_room",
                        position: [8.3, -1.5, 18.1],
                    },
                    {
                        id: "hs_bed1_to_bath",
                        type: "NAVIGATION",
                        name: "Phòng tắm",
                        targetSceneId: "bath_room_1",
                        position: [13.5, -1.1, -14.7],
                    },
                ],
            },
            {
                id: "bath_room_1",
                name: "Phòng tắm 1",
                imageUrl: "/resort/bath_room_1.jpg",
                hotspots: [
                    {
                        id: "hs_bath1_to_bed",
                        type: "NAVIGATION",
                        name: "Phòng ngủ",
                        targetSceneId: "bed_room_1",
                        position: [-0.2, -0.1, -20],
                    },
                    {
                        id: "hs_bath1_info_tub",
                        type: "INFO",
                        name: "Bồn tắm & vòi sen",
                        description: "Bồn tắm hiện đại kèm khu vực vòi sen riêng, mang lại trải nghiệm tắm sang trọng.",
                        position: [-19.4, -1.7, 4.7],
                    },
                    {
                        id: "hs_bath1_info_sink",
                        type: "INFO",
                        name: "Bồn rửa & gương",
                        description: "Bồn rửa sang trọng với gương lớn, hoàn hảo cho việc chăm sóc cá nhân hàng ngày.",
                        position: [1.3, 5, 19.3],
                    },
                ],
            },
            {
                id: "bed_room_2",
                name: "Phòng ngủ 2",
                imageUrl: "/resort/bed_room_2.jpg",
                hotspots: [
                    {
                        id: "hs_bed2_to_living",
                        type: "NAVIGATION",
                        name: "Phòng khách",
                        targetSceneId: "living_room",
                        position: [7.4, -1.7, 18.5],
                    },
                    {
                        id: "hs_bed2_to_bath",
                        type: "NAVIGATION",
                        name: "Phòng tắm",
                        targetSceneId: "bath_room_2",
                        position: [-2, -2.4, 19.8],
                    },
                    {
                        id: "hs_bed2_info_fireplace",
                        type: "INFO",
                        name: "Lò sưởi & sofa",
                        description: "Góc ấm cúng với lò sưởi và sofa, hoàn hảo để thư giãn và tận hưởng hơi ấm.",
                        position: [10.8, -3.2, -16.5],
                    },
                ],
            },
            {
                id: "bath_room_2",
                name: "Phòng tắm 2",
                imageUrl: "/resort/bath_room_2.jpg",
                hotspots: [
                    {
                        id: "hs_bath2r_to_bed",
                        type: "NAVIGATION",
                        name: "Phòng ngủ",
                        targetSceneId: "bed_room_2",
                        position: [19.5, -0.4, -4.3],
                    },
                    {
                        id: "hs_bath2r_info_tub",
                        type: "INFO",
                        name: "Bồn tắm đá cẩm thạch",
                        description: "Bồn tắm đá cẩm thạch, hoàn hảo cho một lần ngâm mình thư giãn sau ngày dài.",
                        position: [13.9, -7.3, -12.3],
                    },
                    {
                        id: "hs_bath2r_info_shower",
                        type: "INFO",
                        name: "Vòi sen mưa",
                        description: "Vòi sen mưa với áp lực và nhiệt độ nước điều chỉnh được, mang lại trải nghiệm sảng khoái.",
                        position: [-12.9, 14.1, 5.9],
                    },
                ],
            },
            {
                id: "kitchen_dining",
                name: "Bếp & phòng ăn",
                imageUrl: "/resort/kitchen_dining.jpg",
                hotspots: [
                    {
                        id: "hs_kitchen_to_living",
                        type: "NAVIGATION",
                        name: "Phòng khách",
                        targetSceneId: "living_room",
                        position: [14.7, 0.4, 13.6],
                    },
                    {
                        id: "hs_kitchen_info_table",
                        type: "INFO",
                        name: "Bàn ăn gỗ",
                        description: "Bàn ăn gỗ lớn có thể ngồi thoải mái 6-8 người, hoàn hảo cho bữa ăn gia đình hoặc tiếp khách.",
                        position: [9.4, -4.4, 17.1],
                    },
                    {
                        id: "hs_kitchen_info_view",
                        type: "INFO",
                        name: "Tầm nhìn biển",
                        description: "Tầm nhìn tuyệt đẹp ra biển Phú Quốc, mang lại không gian yên bình khi nấu nướng và dùng bữa.",
                        position: [-19.1, 0.8, 5.8],
                    },
                    {
                        id: "hs_kitchen_info_cooking",
                        type: "INFO",
                        name: "Khu bếp nấu",
                        description: "Khu bếp hiện đại với thiết bị cao cấp và không gian rộng rãi để chuẩn bị những bữa ăn ngon.",
                        position: [19, -0.2, 6.1],
                    },
                ],
            },
            {
                id: "entertainment_room",
                name: "Phòng giải trí",
                imageUrl: "/resort/entertainment_room.jpg",
                hotspots: [
                    {
                        id: "hs_entertainment_to_living",
                        type: "NAVIGATION",
                        name: "Phòng khách",
                        targetSceneId: "living_room",
                        position: [15.3, 0.9, -12.9],
                    },
                    {
                        id: "hs_entertainment_info_pool",
                        type: "INFO",
                        name: "Bàn bi-a",
                        description: "Bàn bi-a và phi tiêu để vui chơi cùng bạn bè hoặc gia đình.",
                        position: [11.9, -2.4, -15.9],
                    },
                    {
                        id: "hs_entertainment_info_wifi",
                        type: "INFO",
                        name: "Khu vực Wifi",
                        description: "Khu vực Wifi tốc độ cao để xem phim, chơi game hoặc làm việc từ xa trong khi tận hưởng tiện ích resort.",
                        position: [-6.6, -0.7, -18.9],
                    },
                ],
            },
        ],
    },
];

export function getPanoramaTourForHotel(hotelId: number): PanoramaTour | undefined {
    return PANORAMA_TOURS.find((tour) => tour.hotelId === hotelId);
}
