import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
        ]
      }
    ];
  },
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
        pathname: "/posts/**"
      },
      {
        pathname: "/comic-reference/**"
      }
    ],
    minimumCacheTTL: 2_678_400,
    qualities: [75],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 960, 1200, 1536],
    imageSizes: [96, 160, 180, 220, 320, 420, 520]
  }
};

export default nextConfig;
