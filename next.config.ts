import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iOS and some crawlers ask for these fixed root paths no matter what the
  // <link> tags say. Point them at the real icons instead of a 404.
  async rewrites() {
    return [
      { source: "/apple-touch-icon.png", destination: "/apple-icon.png" },
      { source: "/apple-touch-icon-precomposed.png", destination: "/apple-icon.png" },
      { source: "/favicon.ico", destination: "/icon-192.png" },
    ];
  },
};

export default nextConfig;
