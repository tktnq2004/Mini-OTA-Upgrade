import type { Metadata } from "next";

// page.tsx của route này là client component nên metadata đặt ở layout (server).
export const metadata: Metadata = {
    title: "Quên mật khẩu",
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
