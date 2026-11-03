// Đưa từ khoá người dùng gõ vào chuỗi filter của turkraft (`name~'*abc*'`). Dấu nháy đơn
// phải viết `\'`; dấu `\` thì không có cách escape hợp lệ nên bỏ đi. Không xử lý thì câu
// filter sai cú pháp, backend trả 401 và trang quản trị bị đẩy về màn đăng nhập.
export function escapeFilterValue(value: string): string {
  return value.trim().replace(/\\/g, "").replace(/'/g, "\\'");
}
