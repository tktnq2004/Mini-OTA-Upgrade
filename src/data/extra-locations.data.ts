// Toạ độ cho dữ liệu NGOÀI file hành chính VN (vn-provinces-wards.json) —
// hiện là California (Bay Area), seed bằng Mini-OTA/docs/seed/
// california-bay-area.sql (id tỉnh "US-CA", xã/thành phố "US-CA-001".."101").
// Backend không lưu toạ độ cho Province/Ward nên bản đồ lấy tâm từ đây để
// bay tới khi chọn tỉnh/thành phố. Toạ độ mỗi thành phố = trung bình toạ độ
// các khách sạn seed của thành phố đó (file SQL ghi là tâm thành phố gần
// đúng); tâm tỉnh = giữa khung bao toàn bộ các thành phố.
// Sinh tự động từ file SQL — sửa SQL thì sinh lại, đừng sửa tay.

export interface ExtraWard {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export interface ExtraProvince {
    id: string;
    name: string;
    lat: number;
    lng: number;
    zoom: number; // zoom bản đồ khi chọn cả tỉnh (vùng rộng hơn 1 tỉnh VN)
    wards: ExtraWard[];
}

export const EXTRA_PROVINCES: ExtraProvince[] = [
    {
        id: "US-CA",
        name: "California",
        lat: 37.8974,
        lng: -122.2988,
        zoom: 8.5,
        wards: [
            { id: "US-CA-001", name: "Alameda", lat: 37.7760, lng: -122.2381 },
            { id: "US-CA-002", name: "Albany", lat: 37.8872, lng: -122.3080 },
            { id: "US-CA-003", name: "Berkeley", lat: 37.8790, lng: -122.2705 },
            { id: "US-CA-004", name: "Dublin", lat: 37.7074, lng: -121.9247 },
            { id: "US-CA-005", name: "Emeryville", lat: 37.8324, lng: -122.2908 },
            { id: "US-CA-006", name: "Fremont", lat: 37.5487, lng: -121.9927 },
            { id: "US-CA-007", name: "Hayward", lat: 37.6749, lng: -122.0883 },
            { id: "US-CA-008", name: "Livermore", lat: 37.6890, lng: -121.7609 },
            { id: "US-CA-009", name: "Newark", lat: 37.5248, lng: -122.0458 },
            { id: "US-CA-010", name: "Oakland", lat: 37.8001, lng: -122.2744 },
            { id: "US-CA-011", name: "Piedmont", lat: 37.8280, lng: -122.2205 },
            { id: "US-CA-012", name: "Pleasanton", lat: 37.6549, lng: -121.8716 },
            { id: "US-CA-013", name: "San Leandro", lat: 37.7358, lng: -122.1590 },
            { id: "US-CA-014", name: "Union City", lat: 37.5842, lng: -122.0398 },
            { id: "US-CA-015", name: "Antioch", lat: 37.9946, lng: -121.7944 },
            { id: "US-CA-016", name: "Brentwood", lat: 37.9376, lng: -121.6920 },
            { id: "US-CA-017", name: "Clayton", lat: 37.9422, lng: -121.9399 },
            { id: "US-CA-018", name: "Concord", lat: 37.9713, lng: -122.0402 },
            { id: "US-CA-019", name: "Danville", lat: 37.8128, lng: -122.0112 },
            { id: "US-CA-020", name: "El Cerrito", lat: 37.9107, lng: -122.3026 },
            { id: "US-CA-021", name: "Hercules", lat: 38.0144, lng: -122.2980 },
            { id: "US-CA-022", name: "Lafayette", lat: 37.8930, lng: -122.1092 },
            { id: "US-CA-023", name: "Martinez", lat: 38.0196, lng: -122.1348 },
            { id: "US-CA-024", name: "Moraga", lat: 37.8358, lng: -122.1208 },
            { id: "US-CA-025", name: "Oakley", lat: 38.0031, lng: -121.7149 },
            { id: "US-CA-026", name: "Orinda", lat: 37.8846, lng: -122.1846 },
            { id: "US-CA-027", name: "Pinole", lat: 37.9985, lng: -122.2876 },
            { id: "US-CA-028", name: "Pittsburg", lat: 38.0168, lng: -121.8855 },
            { id: "US-CA-029", name: "Pleasant Hill", lat: 37.9594, lng: -122.0669 },
            { id: "US-CA-030", name: "Richmond", lat: 37.9466, lng: -122.3447 },
            { id: "US-CA-031", name: "San Pablo", lat: 37.9595, lng: -122.3554 },
            { id: "US-CA-032", name: "San Ramon", lat: 37.7886, lng: -121.9713 },
            { id: "US-CA-033", name: "Walnut Creek", lat: 37.9119, lng: -122.0533 },
            { id: "US-CA-034", name: "Belvedere", lat: 37.8705, lng: -122.4704 },
            { id: "US-CA-035", name: "Corte Madera", lat: 37.9175, lng: -122.5248 },
            { id: "US-CA-036", name: "Fairfax", lat: 37.9917, lng: -122.5926 },
            { id: "US-CA-037", name: "Larkspur", lat: 37.9420, lng: -122.5246 },
            { id: "US-CA-038", name: "Mill Valley", lat: 37.8947, lng: -122.5550 },
            { id: "US-CA-039", name: "Novato", lat: 38.1145, lng: -122.5611 },
            { id: "US-CA-040", name: "Ross", lat: 37.9658, lng: -122.5609 },
            { id: "US-CA-041", name: "San Anselmo", lat: 37.9687, lng: -122.5603 },
            { id: "US-CA-042", name: "San Rafael", lat: 37.9696, lng: -122.5276 },
            { id: "US-CA-043", name: "Sausalito", lat: 37.8686, lng: -122.4772 },
            { id: "US-CA-044", name: "Tiburon", lat: 37.8627, lng: -122.4577 },
            { id: "US-CA-045", name: "American Canyon", lat: 38.1790, lng: -122.2662 },
            { id: "US-CA-046", name: "Calistoga", lat: 38.5713, lng: -122.5874 },
            { id: "US-CA-047", name: "Napa", lat: 38.3002, lng: -122.2929 },
            { id: "US-CA-048", name: "St. Helena", lat: 38.5152, lng: -122.4616 },
            { id: "US-CA-049", name: "Yountville", lat: 38.3944, lng: -122.3583 },
            { id: "US-CA-050", name: "San Francisco", lat: 37.7732, lng: -122.4211 },
            { id: "US-CA-051", name: "Atherton", lat: 37.4563, lng: -122.1981 },
            { id: "US-CA-052", name: "Belmont", lat: 37.5146, lng: -122.2769 },
            { id: "US-CA-053", name: "Brisbane", lat: 37.6899, lng: -122.3928 },
            { id: "US-CA-054", name: "Burlingame", lat: 37.5888, lng: -122.3627 },
            { id: "US-CA-055", name: "Colma", lat: 37.6744, lng: -122.4641 },
            { id: "US-CA-056", name: "Daly City", lat: 37.6910, lng: -122.4805 },
            { id: "US-CA-057", name: "East Palo Alto", lat: 37.4633, lng: -122.1316 },
            { id: "US-CA-058", name: "Foster City", lat: 37.5560, lng: -122.2762 },
            { id: "US-CA-059", name: "Half Moon Bay", lat: 37.4577, lng: -122.4254 },
            { id: "US-CA-060", name: "Hillsborough", lat: 37.5743, lng: -122.3692 },
            { id: "US-CA-061", name: "Menlo Park", lat: 37.4503, lng: -122.1795 },
            { id: "US-CA-062", name: "Millbrae", lat: 37.6054, lng: -122.3894 },
            { id: "US-CA-063", name: "Pacifica", lat: 37.6109, lng: -122.4755 },
            { id: "US-CA-064", name: "Portola Valley", lat: 37.3743, lng: -122.2383 },
            { id: "US-CA-065", name: "Redwood City", lat: 37.4827, lng: -122.2384 },
            { id: "US-CA-066", name: "San Bruno", lat: 37.6282, lng: -122.4160 },
            { id: "US-CA-067", name: "San Carlos", lat: 37.5104, lng: -122.2657 },
            { id: "US-CA-068", name: "San Mateo", lat: 37.5710, lng: -122.3271 },
            { id: "US-CA-069", name: "South San Francisco", lat: 37.6507, lng: -122.4133 },
            { id: "US-CA-070", name: "Woodside", lat: 37.4320, lng: -122.2590 },
            { id: "US-CA-071", name: "Campbell", lat: 37.2877, lng: -121.9422 },
            { id: "US-CA-072", name: "Cupertino", lat: 37.3285, lng: -122.0220 },
            { id: "US-CA-073", name: "Gilroy", lat: 36.9976, lng: -121.5715 },
            { id: "US-CA-074", name: "Los Altos", lat: 37.3813, lng: -122.1244 },
            { id: "US-CA-075", name: "Los Altos Hills", lat: 37.3710, lng: -122.1482 },
            { id: "US-CA-076", name: "Los Gatos", lat: 37.2259, lng: -121.9628 },
            { id: "US-CA-077", name: "Milpitas", lat: 37.4440, lng: -121.8890 },
            { id: "US-CA-078", name: "Monte Sereno", lat: 37.2365, lng: -121.9892 },
            { id: "US-CA-079", name: "Morgan Hill", lat: 37.1279, lng: -121.6467 },
            { id: "US-CA-080", name: "Mountain View", lat: 37.3757, lng: -122.0761 },
            { id: "US-CA-081", name: "Palo Alto", lat: 37.4526, lng: -122.1335 },
            { id: "US-CA-082", name: "San Jose", lat: 37.3388, lng: -121.8830 },
            { id: "US-CA-083", name: "Santa Clara", lat: 37.3553, lng: -121.9587 },
            { id: "US-CA-084", name: "Saratoga", lat: 37.2602, lng: -122.0273 },
            { id: "US-CA-085", name: "Sunnyvale", lat: 37.3684, lng: -122.0436 },
            { id: "US-CA-086", name: "Benicia", lat: 38.0577, lng: -122.1482 },
            { id: "US-CA-087", name: "Dixon", lat: 38.4463, lng: -121.8251 },
            { id: "US-CA-088", name: "Fairfield", lat: 38.2540, lng: -122.0378 },
            { id: "US-CA-089", name: "Rio Vista", lat: 38.1443, lng: -121.6971 },
            { id: "US-CA-090", name: "Suisun City", lat: 38.2281, lng: -122.0516 },
            { id: "US-CA-091", name: "Vacaville", lat: 38.3593, lng: -121.9823 },
            { id: "US-CA-092", name: "Vallejo", lat: 38.1144, lng: -122.2590 },
            { id: "US-CA-093", name: "Cloverdale", lat: 38.7971, lng: -123.0260 },
            { id: "US-CA-094", name: "Cotati", lat: 38.3384, lng: -122.7120 },
            { id: "US-CA-095", name: "Healdsburg", lat: 38.6131, lng: -122.8572 },
            { id: "US-CA-096", name: "Petaluma", lat: 38.2348, lng: -122.6405 },
            { id: "US-CA-097", name: "Rohnert Park", lat: 38.3320, lng: -122.7107 },
            { id: "US-CA-098", name: "Santa Rosa", lat: 38.4439, lng: -122.7145 },
            { id: "US-CA-099", name: "Sebastopol", lat: 38.4131, lng: -122.8349 },
            { id: "US-CA-100", name: "Sonoma", lat: 38.2981, lng: -122.4633 },
            { id: "US-CA-101", name: "Windsor", lat: 38.5442, lng: -122.8190 },
        ],
    },
];
