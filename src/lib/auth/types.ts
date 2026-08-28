// Type cho phiên đăng nhập của KHÁCH (public site) — song song với
// src/lib/admin/types.ts nhưng tách riêng vì 2 nhóm cookie/route khác nhau
// (mota_at/mota_rt cho admin, mota_acc_at/mota_acc_rt cho khách — không dùng
// chung để 1 người vừa đăng nhập /admin vừa đăng nhập trang chính không đá
// nhau).

// user object trong JWT chỉ có id/email/name (xem RestLoginDTO.UserLogin ở
// backend) — không có phone/username/role, nên SessionUser chỉ nên dùng để
// hiển thị nhanh (header, "Xin chào X"). Muốn đầy đủ hồ sơ (phone, username)
// phải gọi getMyProfile() (GET /users/{id}) riêng.
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

export interface RegisterInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// password để trống = giữ nguyên mật khẩu cũ (xem ghi chú ở
// ReqUpdateUserDTO/UserService.update bên backend — trước đây bug ghi đè
// password rỗng, đã sửa).
export interface UpdateProfileInput {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password?: string;
}
