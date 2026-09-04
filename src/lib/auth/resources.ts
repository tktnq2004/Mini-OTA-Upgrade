import { accountGet, accountPut } from "./apiClient";
import type { AccountProfile, UpdateProfileInput } from "./types";

// GET/PUT /users/me qua proxy đã đăng nhập — id không truyền lên, backend tự
// lấy từ JWT của người gọi (JwtUtils.getIdUserLogin()), không có cách nào
// đọc/sửa hồ sơ người khác qua 2 API này (khác hẳn API admin riêng
// /admin/users/{userId}, chưa có FE dùng tới).
export const getMyProfile = () => accountGet<AccountProfile>("users/me");

// input.password là mật khẩu HIỆN TẠI (xác thực lại trước khi cho sửa) —
// không phải mật khẩu mới. Đổi mật khẩu là luồng khác (chưa có ở FE).
//
// Trả về "unknown" thay vì AccountProfile CÓ CHỦ Ý: PUT /users/me/local trả
// thẳng entity User thô (field "userName", viết hoa N), khác hẳn ResUser mà
// GET /users/me trả về (field "username", viết thường) — 2 shape không
// khớp nhau. Không cố gộp/normalize ở đây; nơi gọi nên refetch getMyProfile()
// sau khi update thành công để luôn có đúng shape ResUser nhất quán.
export const updateMyProfile = (input: UpdateProfileInput) => accountPut<unknown>("users/me/local", input);
