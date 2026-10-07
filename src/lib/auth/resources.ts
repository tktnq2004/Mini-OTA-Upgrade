import { accountFetch, accountGet, accountPost, accountPut } from "./apiClient";
import type {
  AccountProfile,
  MyBooking,
  OtpSession,
  ResetPasswordInput,
  ResetTokenInfo,
  UpdateProfileInput,
} from "./types";

export const getMyProfile = () => accountGet<AccountProfile>("users/me");

export const updateMyProfile = (input: UpdateProfileInput) => accountPut<unknown>("users/me/local", input);

// Gửi mã OTP 6 số về email — bước 1 của đăng ký. Trả { exp }: số giây OTP còn
// hiệu lực, dùng làm thời gian đếm ngược trước khi được bấm "Gửi lại mã".
// Gọi lại khi còn hiệu lực sẽ bị 429 kèm AccountApiError.retryAfter.
export const sendRegisterOtp = (email: string) =>
  accountPost<OtpSession>("auth/register/send-otp-register", { email });

// Đăng nhập không cần mật khẩu — gửi OTP 6 số về email đã có tài khoản. Backend
// (AuthService.sendOtpLogin) cố tình trả 200 + {exp} y hệt dù email chưa có
// tài khoản (không lộ email nào tồn tại) — lỗi "User not found" chỉ xuất hiện
// sau, ở bước nhập OTP (loginWithOtp).
export const sendLoginOtp = (email: string) => accountPost<OtpSession>("auth/login/send-otp-login", { email });

// Quên mật khẩu (CHƯA đăng nhập) — backend luôn trả 200 dù email có tồn tại
// hay không, không có cách nào biết "gửi thành công" theo nghĩa email đã tới
// nơi, UI chỉ nên hiện 1 thông báo chung chung.
export const sendForgotPasswordLink = (email: string) => accountPost<void>("auth/forgot-password", { email });

// Đọc trước khi hiện form đổi mật khẩu ở /reset-password: token còn dùng
// được không, và có cần hỏi mật khẩu hiện tại không (link tự đổi mật khẩu khi
// đã đăng nhập thì có, link quên mật khẩu thì không — xem ResetTokenInfo).
export const verifyResetToken = (token: string) =>
  accountGet<ResetTokenInfo>(`auth/password-reset/verify?token=${encodeURIComponent(token)}`);

// Bước cuối của cả 2 luồng (quên mật khẩu / tự đổi mật khẩu) — xác thực bằng
// chính token trong body, không cần đang đăng nhập.
export const resetPassword = (input: ResetPasswordInput) => accountPost<void>("users/me/password-change", input);

// Tự đổi mật khẩu KHI ĐÃ đăng nhập (trang tài khoản) — khác hẳn luồng trên:
// gọi này cần Bearer token thật (đi qua catch-all [...path], không phải route
// public ở trên), backend gửi link đổi mật khẩu về đúng email của chính mình.
export const requestPasswordChange = () => accountFetch<void>("users/me/password-change-request", { method: "POST" });

// GET /bookings/me — booking của user đang đăng nhập. Backend có thể trả mảng
// thẳng hoặc dạng phân trang { meta, result } -> chuẩn hoá về mảng.
export const getMyBookings = async (): Promise<MyBooking[]> => {
  const data = await accountGet<MyBooking[] | { result?: MyBooking[]; content?: MyBooking[] }>("bookings/me");
  if (Array.isArray(data)) return data;
  return data?.result ?? data?.content ?? [];
};
