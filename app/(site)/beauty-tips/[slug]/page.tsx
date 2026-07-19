import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticleView } from "@/components/site/post-article-view";
import { getPostBySlug, getPublishedPosts } from "@/lib/queries";
import { defaultOgImage, toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { getCollectionsForPost } from "@/lib/collections";
import { extractArticleImages } from "@/lib/article-format";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

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
  const [post, allPosts] = await Promise.all([getPostBySlug(slug), getPublishedPosts()]);

  if (!post || !post.published) {
    notFound();
  }

  const publishedAt = post.publishedAt || post.createdAt;
  const postCollectionSlugs = new Set(getCollectionsForPost(post.slug).map((collection) => collection.slug));
  const relatedPosts = allPosts
    .filter((candidate) => {
      if (candidate.id === post.id) {
        return false;
      }

      const candidateCollections = getCollectionsForPost(candidate.slug);
      return candidateCollections.some((collection) => postCollectionSlugs.has(collection.slug));
    })
    .slice(0, 3);
  const authorName = post.authorName?.trim() || "Neatique Beauty Editorial Team";
  const authorType = post.authorType === "Person" ? "Person" : "Organization";
  const articleImages = extractArticleImages(post.content).map((image) => safeAbsoluteImageUrl(image.src));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [safeAbsoluteImageUrl(post.coverImageUrl), ...articleImages],
    datePublished: coerceIsoDate(publishedAt, post.createdAt),
    dateModified: coerceIsoDate(post.updatedAt, post.createdAt),
    articleSection: post.category,
    keywords: [post.focusKeyword, ...normalizeKeywords(post.secondaryKeywords)].filter(Boolean).join(", "),
    author: {
      "@type": authorType,
      name: authorName,
      ...(post.authorUrl ? { url: post.authorUrl } : {})
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.title
    },
    ...(post.editorialReviewed && post.reviewerName
      ? {
          reviewedBy: {
            "@type": "Person",
            name: post.reviewerName,
            ...(post.reviewerUrl ? { url: post.reviewerUrl } : {})
          }
        }
      : {}),
    citation: post.externalLinks.map((link) => link.url),
    isAccessibleForFree: true,
    mainEntityOfPage: `${siteConfig.url}/beauty-tips/${post.slug}`
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PostArticleView post={post} relatedPosts={relatedPosts} />
    </>
  );
}
