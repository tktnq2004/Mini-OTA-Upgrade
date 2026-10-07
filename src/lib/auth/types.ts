// Type cho phiên đăng nhập của KHÁCH (public site) — song song với
// src/lib/admin/types.ts nhưng tách riêng vì 2 nhóm cookie/route khác nhau
// (mota_at/mota_rt cho admin, mota_acc_at/mota_acc_rt cho khách — không dùng
// chung để 1 người vừa đăng nhập /admin vừa đăng nhập trang chính không đá
// nhau).

// user object trong JWT chỉ có id/email/name (xem RestLoginDTO.UserLogin ở
// backend) — không có phone/username/role, nên SessionUser chỉ nên dùng để
// hiển thị nhanh (header, "Xin chào X"). Muốn đầy đủ hồ sơ (phone, username)
// phải gọi getMyProfile() (GET /users/me) riêng.
export interface SessionUser {
  id: number;
  email: string;
  name: string;
}

export type LegacyRole = "ADMIN" | "CUSTOMER";

// Hồ sơ đầy đủ — khớp ResUser bên backend.
export interface AccountProfile {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: LegacyRole | null;
}

// Thông tin thu thập ở bước 1 của form đăng ký (trước khi có OTP).
export interface RegisterInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
}

// Bước 2: kèm mã OTP 6 số đã nhận qua email — gửi lên POST /auth/register để
// tạo tài khoản thật (backend tự kiểm tra OTP, xem AuthService.register).
export interface CompleteRegisterInput extends RegisterInput {
  otp: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Backend trả { exp } = số giây OTP còn hiệu lực — FE dùng luôn số này làm
// thời gian đếm ngược trước khi được phép bấm "Gửi lại mã".
export interface OtpSession {
  exp: number;
}

// Mật khẩu mới + token lấy từ link trong email — forgot-password lẫn tự đổi
// mật khẩu khi đã đăng nhập đều dùng chung link này. Có link (= đã xác minh
// qua email) là đủ, không hỏi thêm mật khẩu hiện tại ở cả 2 trường hợp.
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

// Khớp ResPasswordResetVerify bên backend (vẫn còn field requireOldPassword
// cho tương thích ngược nhưng backend giờ luôn trả false) — đọc trước khi
// hiện form đổi mật khẩu ở /reset-password để biết token còn dùng được không.
export interface ResetTokenInfo {
  valid: boolean;
  expiresAt: string | null;
  requireOldPassword: boolean;
}

// PUT /users/me/local — backend (UserService.update_own) yêu cầu đúng
// MẬT KHẨU HIỆN TẠI để xác thực lại trước khi cho sửa (không phải để đổi
// mật khẩu mới — đổi mật khẩu là API khác, /users/me/password, chưa nối FE).
// fullName/username/email/phone để trống (hoặc không đổi so với hiện tại)
// thì giữ nguyên — không bắt buộc phải điền đủ 4 field mỗi lần lưu.
export interface UpdateProfileInput {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  password: string;
}

// 1 booking trong GET /bookings/me (entity Booking của backend, chỉ khai báo
// các field trang dùng). amount là tổng giá 1 đêm của các phòng -> tổng tiền
// = amount × số đêm (giống checkout).
export interface MyBooking {
  id: number;
  amount: number;
  bookingDate?: string; // ISO datetime
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  paymentStatus?: string; // "Pending" | "Completed" | ...
  hotel?: { id: number; name?: string } | null; // chưa có trong response, có thì link thẳng tới phòng
  bookingRooms?: {
    id: number;
    pricePerNight: number;
    room?: {
      id: number;
      name: string;
      thumbnail?: string | null;
      roomType?: { roomTypeName?: string } | null;
    } | null;
  }[];
}
