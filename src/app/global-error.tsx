"use client";

// Lỗi xảy ra ngay ở layout gốc (provider, font...) — lúc này không còn layout/provider nào để
// dùng, nên trang tự chứa <html>/<body>, style inline và chữ song ngữ cố định.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="vi">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Inter, -apple-system, sans-serif",
                    background: "#f6f7f8",
                    color: "#16181d",
                }}
            >
                <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
                    <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>WenGo đang gặp sự cố</h1>
                    <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 20px", lineHeight: 1.6 }}>
                        Trang không tải được. Vui lòng thử lại sau ít phút.
                        <br />
                        Something went wrong. Please try again in a moment.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            height: 40,
                            padding: "0 18px",
                            border: "none",
                            borderRadius: 6,
                            background: "#2563eb",
                            color: "#ffffff",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Thử lại · Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
