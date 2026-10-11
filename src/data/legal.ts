// Nội dung trang Điều khoản dịch vụ & Chính sách quyền riêng tư (song ngữ).
// Viết theo ĐÚNG những gì hệ thống đang làm (đăng nhập email/OTP/Google, phiên bằng
// cookie httpOnly, thanh toán thẻ qua Stripe, yêu thích/ngôn ngữ/giao diện lưu localStorage).
// LƯU Ý: đây là bản nền để ra mắt — cần người phụ trách pháp lý rà soát và bổ sung thông tin
// pháp nhân (tên công ty, mã số thuế, địa chỉ, kênh liên hệ) trước khi vận hành thương mại.

export type LegalDocKey = "terms" | "privacy";

export interface LegalSection {
    heading: string;
    paragraphs: string[];
}

export interface LegalDoc {
    title: string;
    intro: string;
    sections: LegalSection[];
}

export const LEGAL_UPDATED_AT = "2026-10-09";

export const LEGAL_DOCS: Record<LegalDocKey, Record<"vi" | "en", LegalDoc>> = {
    terms: {
        vi: {
            title: "Điều khoản dịch vụ",
            intro: "Khi tạo tài khoản hoặc đặt phòng trên Trạm OTA, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.",
            sections: [
                {
                    heading: "1. Về dịch vụ",
                    paragraphs: [
                        "Trạm OTA là nền tảng giúp bạn tìm, so sánh và đặt phòng tại các khách sạn ở Việt Nam. Thông tin khách sạn, phòng, giá và tiện nghi do khách sạn cung cấp; Trạm OTA nỗ lực hiển thị chính xác nhưng không bảo đảm tuyệt đối mọi chi tiết luôn được cập nhật tức thời.",
                    ],
                },
                {
                    heading: "2. Tài khoản",
                    paragraphs: [
                        "Bạn có thể đăng ký bằng email (kèm mã OTP xác thực) hoặc đăng nhập bằng Google. Bạn chịu trách nhiệm về tính chính xác của thông tin đã cung cấp và giữ an toàn quyền truy cập vào email, tài khoản Google dùng để đăng nhập.",
                        "Trạm OTA có thể tạm khoá tài khoản có dấu hiệu gian lận, lạm dụng hoặc vi phạm các điều khoản này.",
                    ],
                },
                {
                    heading: "3. Đặt phòng và giá",
                    paragraphs: [
                        "Giá hiển thị là giá mỗi đêm cho phòng tương ứng. Tổng tiền được tính theo số đêm và được hiển thị rõ trước khi bạn xác nhận thanh toán.",
                        "Đặt phòng chỉ được xác nhận khi thanh toán thành công và bạn nhận được mã đặt chỗ. Bạn có thể xem lại đơn trong mục \"Đặt phòng của tôi\".",
                    ],
                },
                {
                    heading: "4. Thanh toán",
                    paragraphs: [
                        "Thanh toán bằng thẻ được xử lý qua cổng Stripe. Thông tin thẻ được nhập trực tiếp vào biểu mẫu bảo mật của Stripe; Trạm OTA không lưu số thẻ đầy đủ của bạn.",
                    ],
                },
                {
                    heading: "5. Huỷ phòng và hoàn tiền",
                    paragraphs: [
                        "Chính sách huỷ được quy định theo từng phòng và hiển thị trên trang chi tiết phòng trước khi đặt. Phòng có chính sách huỷ linh hoạt cho phép huỷ theo điều kiện được ghi kèm; phòng không hoàn huỷ sẽ không được hoàn tiền khi huỷ.",
                        "Khoản hoàn tiền (nếu có) được trả về phương thức thanh toán ban đầu; thời gian nhận tiền phụ thuộc ngân hàng phát hành thẻ.",
                    ],
                },
                {
                    heading: "6. Trách nhiệm của người dùng",
                    paragraphs: [
                        "Bạn đồng ý không sử dụng Trạm OTA cho mục đích trái pháp luật, không cố tình gây gián đoạn hệ thống, không thu thập dữ liệu trái phép và không đăng đánh giá sai sự thật.",
                    ],
                },
                {
                    heading: "7. Thay đổi điều khoản",
                    paragraphs: [
                        "Trạm OTA có thể cập nhật các điều khoản này. Ngày cập nhật gần nhất được ghi ở đầu trang; việc tiếp tục sử dụng dịch vụ sau khi cập nhật đồng nghĩa với việc bạn chấp nhận nội dung mới.",
                    ],
                },
            ],
        },
        en: {
            title: "Terms of Service",
            intro: "By creating an account or booking on Trạm OTA, you agree to the terms below. Please read them carefully before using the service.",
            sections: [
                {
                    heading: "1. The service",
                    paragraphs: [
                        "Trạm OTA helps you find, compare and book hotels across Vietnam. Hotel, room, price and amenity information is provided by the hotels; Trạm OTA strives to display it accurately but cannot guarantee every detail is updated in real time.",
                    ],
                },
                {
                    heading: "2. Accounts",
                    paragraphs: [
                        "You can sign up with email (verified by an OTP code) or log in with Google. You are responsible for the accuracy of the information you provide and for keeping access to your email and Google account secure.",
                        "Trạm OTA may suspend accounts showing signs of fraud, abuse or violation of these terms.",
                    ],
                },
                {
                    heading: "3. Bookings and prices",
                    paragraphs: [
                        "Displayed prices are per night for the given room. The total is calculated from the number of nights and shown clearly before you confirm payment.",
                        "A booking is confirmed only once payment succeeds and you receive a booking code. You can review it under \"My bookings\".",
                    ],
                },
                {
                    heading: "4. Payment",
                    paragraphs: [
                        "Card payments are processed by Stripe. Card details are entered directly into Stripe's secure form; Trạm OTA does not store your full card number.",
                    ],
                },
                {
                    heading: "5. Cancellations and refunds",
                    paragraphs: [
                        "Cancellation policies are set per room and shown on the room page before you book. Rooms with a flexible policy can be cancelled under the stated conditions; non-refundable rooms are not refunded on cancellation.",
                        "Refunds, where applicable, go back to the original payment method; timing depends on your card issuer.",
                    ],
                },
                {
                    heading: "6. Your responsibilities",
                    paragraphs: [
                        "You agree not to use Trạm OTA for unlawful purposes, deliberately disrupt the system, scrape data without permission, or post false reviews.",
                    ],
                },
                {
                    heading: "7. Changes to these terms",
                    paragraphs: [
                        "Trạm OTA may update these terms. The latest update date is shown at the top of this page; continuing to use the service after an update means you accept the new terms.",
                    ],
                },
            ],
        },
    },
    privacy: {
        vi: {
            title: "Chính sách quyền riêng tư",
            intro: "Chính sách này giải thích Trạm OTA thu thập những dữ liệu gì, dùng để làm gì và bạn có những quyền gì đối với dữ liệu của mình.",
            sections: [
                {
                    heading: "1. Dữ liệu chúng tôi thu thập",
                    paragraphs: [
                        "Thông tin tài khoản: họ tên, email và (nếu bạn đăng nhập bằng Google) thông tin hồ sơ cơ bản mà Google chia sẻ.",
                        "Thông tin đặt phòng: khách sạn, phòng, ngày nhận/trả phòng, số khách, trạng thái thanh toán.",
                        "Thông tin thanh toán: do Stripe xử lý. Trạm OTA chỉ nhận kết quả giao dịch và thông tin rút gọn của thẻ (vd. 4 số cuối), không nhận số thẻ đầy đủ.",
                        "Vị trí: chỉ khi bạn chủ động bấm \"Tìm quanh đây\" và cho phép trình duyệt chia sẻ vị trí; vị trí dùng để lọc khách sạn gần bạn.",
                    ],
                },
                {
                    heading: "2. Cookie và lưu trữ trên trình duyệt",
                    paragraphs: [
                        "Cookie bảo mật (httpOnly) dùng để duy trì phiên đăng nhập.",
                        "Bộ nhớ trình duyệt (localStorage) lưu ngôn ngữ, giao diện sáng/tối, danh sách phòng đã lưu và khách sạn đã xem gần đây — các dữ liệu này nằm trên thiết bị của bạn và có thể xoá bằng cách xoá dữ liệu trang web trong trình duyệt.",
                    ],
                },
                {
                    heading: "3. Mục đích sử dụng",
                    paragraphs: [
                        "Cung cấp và duy trì tài khoản, xử lý đặt phòng và thanh toán, gửi mã OTP và thông báo liên quan đến đơn đặt phòng, hỗ trợ khách hàng, phòng chống gian lận và cải thiện dịch vụ.",
                    ],
                },
                {
                    heading: "4. Chia sẻ dữ liệu",
                    paragraphs: [
                        "Trạm OTA chỉ chia sẻ dữ liệu cần thiết với: khách sạn bạn đặt (để giữ và phục vụ phòng), Stripe (để xử lý thanh toán), và cơ quan có thẩm quyền khi pháp luật yêu cầu. Trạm OTA không bán dữ liệu cá nhân của bạn.",
                    ],
                },
                {
                    heading: "5. Bảo mật",
                    paragraphs: [
                        "Dữ liệu được truyền qua kết nối mã hoá; phiên đăng nhập dùng cookie httpOnly để hạn chế bị đánh cắp qua mã độc trên trang.",
                    ],
                },
                {
                    heading: "6. Quyền của bạn",
                    paragraphs: [
                        "Bạn có thể xem và cập nhật thông tin cá nhân trong mục Hồ sơ, đổi mật khẩu, và yêu cầu xoá tài khoản. Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, bạn có quyền được biết, đồng ý, truy cập, chỉnh sửa, xoá và rút lại sự đồng ý đối với dữ liệu của mình.",
                    ],
                },
                {
                    heading: "7. Thay đổi chính sách",
                    paragraphs: [
                        "Khi chính sách thay đổi, ngày cập nhật ở đầu trang sẽ được thay đổi tương ứng.",
                    ],
                },
            ],
        },
        en: {
            title: "Privacy Policy",
            intro: "This policy explains what data Trạm OTA collects, why, and what rights you have over your data.",
            sections: [
                {
                    heading: "1. Data we collect",
                    paragraphs: [
                        "Account information: name, email and, if you log in with Google, the basic profile information Google shares.",
                        "Booking information: hotel, room, check-in/out dates, number of guests and payment status.",
                        "Payment information: handled by Stripe. Trạm OTA only receives the transaction result and limited card details (e.g. last 4 digits), never your full card number.",
                        "Location: only when you tap \"Find nearby\" and allow your browser to share it; it is used to filter hotels near you.",
                    ],
                },
                {
                    heading: "2. Cookies and browser storage",
                    paragraphs: [
                        "Secure (httpOnly) cookies keep you logged in.",
                        "Browser storage (localStorage) keeps your language, light/dark theme, saved stays and recently viewed hotels — this data stays on your device and can be removed by clearing site data in your browser.",
                    ],
                },
                {
                    heading: "3. How we use data",
                    paragraphs: [
                        "To provide your account, process bookings and payments, send OTP codes and booking-related notices, support customers, prevent fraud and improve the service.",
                    ],
                },
                {
                    heading: "4. Sharing",
                    paragraphs: [
                        "Trạm OTA only shares what is necessary with: the hotel you book (to hold and serve your room), Stripe (to process payment), and authorities when required by law. Trạm OTA does not sell your personal data.",
                    ],
                },
                {
                    heading: "5. Security",
                    paragraphs: [
                        "Data is sent over encrypted connections; sessions use httpOnly cookies to reduce the risk of theft through malicious scripts.",
                    ],
                },
                {
                    heading: "6. Your rights",
                    paragraphs: [
                        "You can view and update your personal details in your Profile, change your password and request account deletion. Under Vietnam's Decree 13/2023/ND-CP on personal data protection, you have the right to be informed, to consent, to access, correct and delete your data, and to withdraw consent.",
                    ],
                },
                {
                    heading: "7. Changes",
                    paragraphs: ["When this policy changes, the update date at the top of the page will change accordingly."],
                },
            ],
        },
    },
};
