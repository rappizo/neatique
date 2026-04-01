import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { parseArticleContent } from "@/lib/article-format";
import { formatDate } from "@/lib/format";
import { getPostBySlug } from "@/lib/queries";
import { toAbsoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

function renderInlineLinks(text: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(linkPattern)) {
    const fullMatch = match[0];
    const label = match[1];
    const url = match[2];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(
      <a
        key={`${keyPrefix}-link-${matchIndex}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );

    lastIndex = start + fullMatch.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
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
  const absoluteImageUrl = toAbsoluteUrl(post.coverImageUrl);
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

  const articleBlocks = parseArticleContent(post.content);
  const publishedAt = post.publishedAt || post.createdAt;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [toAbsoluteUrl(post.coverImageUrl)],
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
    <section className="section">
      <div className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="article-shell">
          <div className="article-hero">
            <p className="eyebrow">{post.category}</p>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
          <div className="article-meta">
              <span>{formatDate(publishedAt)}</span>
              <span>{post.readTime} min read</span>
              {post.focusKeyword ? <span>Keyword: {post.focusKeyword}</span> : null}
            </div>
          </div>
          <div className="panel">
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt || post.title}
              width={1200}
              height={740}
              sizes="(max-width: 720px) 100vw, (max-width: 1200px) 92vw, 1200px"
              quality={75}
              unoptimized
            />
          </div>
          <div className="article-content">
            {articleBlocks.map((block, index) => {
              if (block.type === "h2") {
                return <h2 key={`h2-${index}`}>{renderInlineLinks(block.text, `h2-${index}`)}</h2>;
              }

              if (block.type === "h3") {
                return <h3 key={`h3-${index}`}>{renderInlineLinks(block.text, `h3-${index}`)}</h3>;
              }

              if (block.type === "list") {
                return (
                  <ul key={`list-${index}`}>
                    {block.items.map((item, itemIndex) => (
                      <li key={`${item}-${itemIndex}`}>
                        {renderInlineLinks(item, `list-${index}-${itemIndex}`)}
                      </li>
                    ))}
                  </ul>
                );
              }

              return <p key={`p-${index}`}>{renderInlineLinks(block.text, `p-${index}`)}</p>;
            })}
          </div>

          {post.externalLinks.length > 0 ? (
            <div className="panel article-links">
              <p className="eyebrow">Helpful references</p>
              <h2>Further reading</h2>
              <ul>
                {post.externalLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {post.sourceProductSlug && post.sourceProductName ? (
            <div className="panel article-related-product">
              <p className="eyebrow">Related product</p>
              <h2>Explore the formula mentioned in this article.</h2>
              <p>
                Continue from this guide into the matching product page to see the texture, price,
                and routine fit for {post.sourceProductName}.
              </p>
              <Link href={`/shop/${post.sourceProductSlug}`} className="button button--primary">
                Shop {post.sourceProductName}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
