import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Sinh .next/standalone (server.js + node_modules tối thiểu) để image Docker gọn
  output: "standalone",
};

export default nextConfig;
