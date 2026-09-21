// Đọc kích thước ảnh ở phía client (không cần upload) để cảnh báo sớm.
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh này"));
    };
    img.src = url;
  });
}

// Panorama chuẩn (equirectangular) có tỉ lệ 2:1; lệch nhiều thì ảnh bị méo khi
// phủ lên mặt cầu. Chỉ CẢNH BÁO chứ không chặn (vẫn có thể cố ý). Trả về true =
// tiếp tục upload. Đọc ảnh lỗi thì không cản upload (để phía server quyết định).
export async function confirmPanoramaRatio(file: File): Promise<boolean> {
  try {
    const { width, height } = await readImageSize(file);
    const ratio = width / height;
    if (ratio >= 1.9 && ratio <= 2.1) return true;
    return window.confirm(
      `Ảnh ${width}×${height} không đúng tỉ lệ 2:1 của ảnh 360° (equirectangular) nên sẽ bị méo khi xem. Vẫn upload?`
    );
  } catch {
    return true;
  }
}
