import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "neatiquebeauty.com"
          }
        ],
        destination: "https://www.neatiquebeauty.com/:path*",
        permanent: true
      }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  outputFileTracingExcludes: {
    "/**/*": [".git/**/*", ".next/cache/**/*", "comic/**/*", "public/comic-reference/**/*"]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com"
      },
      {
        protocol: "https",
        hostname: "**.blob.vercel-storage.com"
      }
    ],
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
        pathname: "/media/comic-creation/**"
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
