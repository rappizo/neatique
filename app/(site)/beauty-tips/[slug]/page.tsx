import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticleView } from "@/components/site/post-article-view";
import { getPostBySlug } from "@/lib/queries";
import { defaultOgImage, toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

function coerceIsoDate(value: Date | string | null | undefined, fallback: Date | string) {
  const nextValue = value ?? fallback;
  const parsed = new Date(nextValue);

  return Number.isNaN(parsed.getTime()) ? new Date(fallback).toISOString() : parsed.toISOString();
}

function safeAbsoluteImageUrl(path: string | null | undefined) {
  try {
    return toAbsoluteUrl(path || defaultOgImage.url);
  } catch {
    return toAbsoluteUrl(defaultOgImage.url);
  }
}

function normalizeKeywords(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found"
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const absoluteImageUrl = safeAbsoluteImageUrl(post.coverImageUrl);
  const publishedTime = coerceIsoDate(post.publishedAt, post.createdAt);

  return {
    title,
    description,
    alternates: {
      canonical: `/beauty-tips/${post.slug}`
    },
    keywords: [
      post.title,
      post.category,
      post.focusKeyword || "skincare tips",
      ...normalizeKeywords(post.secondaryKeywords)
    ],
    openGraph: {
      type: "article",
      title: `${title} | ${siteConfig.title}`,
      description,
      url: `${siteConfig.url}/beauty-tips/${post.slug}`,
      publishedTime,
      images: [
        {
          url: absoluteImageUrl,
          alt: post.coverImageAlt || post.title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.title}`,
      description,
      images: [absoluteImageUrl]
    }
  };
}

export default async function BeautyTipPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || !post.published) {
    notFound();
  }

  const publishedAt = post.publishedAt || post.createdAt;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [safeAbsoluteImageUrl(post.coverImageUrl)],
    datePublished: coerceIsoDate(publishedAt, post.createdAt),
    dateModified: coerceIsoDate(post.updatedAt, post.createdAt),
    articleSection: post.category,
    keywords: [post.focusKeyword, ...normalizeKeywords(post.secondaryKeywords)].filter(Boolean).join(", "),
    author: {
      "@type": "Organization",
      name: siteConfig.title
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.title
    },
    mainEntityOfPage: `${siteConfig.url}/beauty-tips/${post.slug}`
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PostArticleView post={post} />
    </>
  );
}
