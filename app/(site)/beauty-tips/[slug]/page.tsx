import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticleView } from "@/components/site/post-article-view";
import { getPostBySlug } from "@/lib/queries";
import { defaultOgImage, toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

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
  const absoluteImageUrl = toAbsoluteUrl(post.coverImageUrl || defaultOgImage.url);
  const publishedAt = post.publishedAt || post.createdAt;

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
      ...post.secondaryKeywords
    ],
    openGraph: {
      type: "article",
      title: `${title} | ${siteConfig.title}`,
      description,
      url: `${siteConfig.url}/beauty-tips/${post.slug}`,
      publishedTime: publishedAt.toISOString(),
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
    image: [toAbsoluteUrl(post.coverImageUrl || defaultOgImage.url)],
    datePublished: publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    articleSection: post.category,
    keywords: [post.focusKeyword, ...post.secondaryKeywords].filter(Boolean).join(", "),
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
