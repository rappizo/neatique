import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/**/*": [".git/**/*", ".next/cache/**/*", "comic/**/*", "public/comic-reference/**/*"]
  },
  images: {
    localPatterns: [
      {
        pathname: "/media/site/**"
      },
      {
        pathname: "/media/product/**"
      },
      {
        pathname: "/media/post/**"
      },
      {
        pathname: "/products/**"
      },
      {
        pathname: "/comic-reference/**"
      }
    ],
    minimumCacheTTL: 2_678_400,
    qualities: [75],
    formats: ["image/webp"],
    deviceSizes: [640, 768, 960, 1200, 1536],
    imageSizes: [96, 160, 180, 220, 320, 420, 520]
  }
};

export default nextConfig;
