import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { getActiveProducts, getPublishedPosts } from "@/lib/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([getActiveProducts(), getPublishedPosts()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteConfig.url}/shop`,
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${siteConfig.url}/beauty-tips`,
      changeFrequency: "weekly",
      priority: 0.9
    },
    {
      url: `${siteConfig.url}/contact`,
      changeFrequency: "monthly",
      priority: 0.7
    }
  ];

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: `${siteConfig.url}/shop/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...posts.map((post) => ({
      url: `${siteConfig.url}/beauty-tips/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75
    }))
  ];
}
