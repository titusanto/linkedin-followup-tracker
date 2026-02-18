import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "*.licdn.com",
      },
    ],
  },
  // CORS is handled dynamically per-route in each API handler.
  // A global wildcard header here would conflict with credentials:"include"
  // (browsers reject ACAO:* when credentials are sent), so we do NOT set it here.
};

export default nextConfig;
