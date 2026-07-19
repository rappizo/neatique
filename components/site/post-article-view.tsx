import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AiGeneratedPersonBadge } from "@/components/ui/ai-generated-person-badge";
import { parseArticleContent, slugifyArticleHeading } from "@/lib/article-format";
import { formatDate } from "@/lib/format";
import { defaultOgImage } from "@/lib/seo";
import type { BeautyPostRecord } from "@/lib/types";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { getCollectionsForPost } from "@/lib/collections";
import { getArticleEnhancements } from "@/lib/article-enhancements";

type PostArticleViewProps = {
  post: BeautyPostRecord;
  previewLabel?: string | null;
  previewNote?: string | null;
  backHref?: string | null;
  backLabel?: string | null;
  relatedPosts?: BeautyPostRecord[];
};

function renderInlineLinks(text: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g;
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
      url.startsWith("/") ? (
        <Link key={`${keyPrefix}-link-${matchIndex}`} href={url}>{label}</Link>
      ) : (
        <a key={`${keyPrefix}-link-${matchIndex}`} href={url} target="_blank" rel="noopener noreferrer">{label}</a>
      )
    );

    lastIndex = start + fullMatch.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function PostArticleView({
  post,
  previewLabel,
  previewNote,
  backHref,
  backLabel,
  relatedPosts = []
}: PostArticleViewProps) {
  const articleBlocks = parseArticleContent(post.content);
  const publishedAt = new Date(post.publishedAt || post.createdAt);
  const updatedAt = new Date(post.updatedAt);
  const imageUrl = post.coverImageUrl || defaultOgImage.url;
  const imageAlt = post.coverImageAlt || post.title || defaultOgImage.alt;
  const authorName = post.authorName?.trim() || "Neatique Beauty Editorial Team";
  const collections = getCollectionsForPost(post.slug);
  const enhancements = getArticleEnhancements(post.slug);
  const tableOfContents = articleBlocks
    .filter((block): block is Extract<(typeof articleBlocks)[number], { type: "h2" }> => block.type === "h2")
    .map((block) => ({ id: slugifyArticleHeading(block.text), label: block.text }));

  return (
    <section className="section">
      <div className="container">
        {!previewLabel ? (
          <Breadcrumbs items={[
            { name: "Home", href: "/" },
            { name: "Beauty Tips", href: "/beauty-tips" },
            { name: post.title, href: `/beauty-tips/${post.slug}` }
          ]} />
        ) : null}
        <div className="article-shell">
          {backHref && backLabel ? (
            <div className="stack-row">
              <Link href={backHref} className="button button--secondary">
                {backLabel}
              </Link>
            </div>
          ) : null}

          <div className="article-hero">
            {previewLabel ? <p className="eyebrow">{previewLabel}</p> : <p className="eyebrow">{post.category}</p>}
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <div className="article-meta">
              <span>By {authorName}</span>
              <span>{formatDate(publishedAt)}</span>
              {updatedAt.getTime() !== publishedAt.getTime() ? <span>Updated {formatDate(updatedAt)}</span> : null}
              <span>{post.readTime} min read</span>
              {post.editorialReviewed && post.reviewerName ? <span>Reviewed by {post.reviewerName}</span> : null}
              {post.aiGenerated ? <span>AI-assisted draft</span> : null}
            </div>
            {previewNote ? <p className="form-note">{previewNote}</p> : null}
          </div>

          <div className="panel article-cover">
            <div className="article-cover__media">
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                className="article-cover__image"
                sizes="(max-width: 720px) 100vw, (max-width: 1200px) 92vw, 1200px"
                quality={75}
                unoptimized={imageUrl.toLowerCase().endsWith(".svg")}
              />
              <AiGeneratedPersonBadge src={imageUrl} />
            </div>
          </div>

          <div className="article-content">
            <aside className="article-summary">
              <p className="eyebrow">In brief</p>
              <p>{post.excerpt}</p>
            </aside>
            {tableOfContents.length >= 3 ? (
              <nav className="article-table-of-contents" aria-label="On this page">
                <p className="eyebrow">On this page</p>
                <ol>
                  {tableOfContents.map((item) => (
                    <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {articleBlocks.map((block, index) => {
              if (block.type === "h2") {
                return <h2 id={slugifyArticleHeading(block.text)} key={`h2-${index}`}>{renderInlineLinks(block.text, `h2-${index}`)}</h2>;
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

              if (block.type === "image") {
                return (
                  <figure className="article-visual" key={`${block.src}-${index}`}>
                    <div className="article-visual__media">
                      <Image
                        src={block.src}
                        alt={block.alt}
                        fill
                        className="article-visual__image"
                        sizes="(max-width: 720px) 100vw, (max-width: 1200px) 86vw, 1000px"
                        quality={78}
                      />
                      <AiGeneratedPersonBadge src={block.src} />
                    </div>
                    {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                  </figure>
                );
              }

              return <p key={`p-${index}`}>{renderInlineLinks(block.text, `p-${index}`)}</p>;
            })}
          </div>

          {enhancements.length > 0 ? (
            <div className="article-content article-content--enhancements">
              {enhancements.map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
                </section>
              ))}
            </div>
          ) : null}

          {collections.length > 0 ? (
            <div className="panel article-topic-paths">
              <p className="eyebrow">Explore the topic</p>
              <h2>Compare the products and routine roles behind this guide.</h2>
              <div className="stack-row">
                {collections.map((collection) => (
                  <Link key={collection.slug} href={`/collections/${collection.slug}`} className="button button--secondary">
                    {collection.shortTitle}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {relatedPosts.length > 0 ? (
            <div className="panel article-related-reading">
              <p className="eyebrow">Related reading</p>
              <h2>Continue with a nearby routine question.</h2>
              <ul>
                {relatedPosts.map((relatedPost) => (
                  <li key={relatedPost.id}><Link href={`/beauty-tips/${relatedPost.slug}`}>{relatedPost.title}</Link></li>
                ))}
              </ul>
            </div>
          ) : null}

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

          <div className="panel article-disclaimer">
            <p className="eyebrow">Editorial note</p>
            <p>
              This article provides general cosmetic education and does not diagnose or treat a
              medical condition. Product details should be checked against current packaging. Patch
              test unfamiliar products and consult a qualified professional for persistent concerns.
            </p>
            {post.aiGenerated && !post.editorialReviewed ? (
              <p className="form-note">This article is identified as AI-assisted; a named editorial review is not yet recorded.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
