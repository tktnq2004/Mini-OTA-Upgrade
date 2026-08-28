import { accountGet, accountPut } from "./apiClient";
import type { AccountProfile, UpdateProfileInput } from "./types";

// GET/PUT /users/{id} qua proxy đã đăng nhập — backend cho phép tự đọc/sửa
// hồ sơ CHÍNH MÌNH (so khớp id trong JWT), không cần quyền USER_READ/
// USER_UPDATE (quyền admin) nữa (xem ghi chú UserController.java).
export const getMyProfile = (id: number) => accountGet<AccountProfile>(`users/${id}`);

export const updateMyProfile = (id: number, input: UpdateProfileInput) =>
  accountPut<AccountProfile>("users", { id, ...input });
