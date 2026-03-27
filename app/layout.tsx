import type { Metadata } from "next";
import Script from "next/script";
import "@/app/globals.css";
import { siteConfig } from "@/lib/site-config";
import { defaultOgImage } from "@/lib/seo";

const GOOGLE_TAG_ID = "G-WRS7GSKT5T";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Neatique Beauty",
    template: "%s | Neatique Beauty"
  },
  description: siteConfig.description,
  applicationName: siteConfig.title,
  referrer: "origin-when-cross-origin",
  keywords: [
    "Neatique Beauty",
    "professional skincare",
    "PDRN cream",
    "PDRN serum",
    "snail mucin cream",
    "snail mucin serum",
    "hydrating skincare",
    "glow skincare",
    "United States skincare brand"
  ],
  authors: [{ name: siteConfig.title, url: siteConfig.url }],
  creator: siteConfig.title,
  publisher: siteConfig.title,
  category: "beauty",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.title,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [defaultOgImage]
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [defaultOgImage.url]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_TAG_ID}');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
