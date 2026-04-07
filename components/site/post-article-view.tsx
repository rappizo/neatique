import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { parseArticleContent } from "@/lib/article-format";
import { formatDate } from "@/lib/format";
import { defaultOgImage } from "@/lib/seo";
import type { BeautyPostRecord } from "@/lib/types";

type PostArticleViewProps = {
  post: BeautyPostRecord;
  previewLabel?: string | null;
  previewNote?: string | null;
  backHref?: string | null;
  backLabel?: string | null;
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

export function PostArticleView({
  post,
  previewLabel,
  previewNote,
  backHref,
  backLabel
}: PostArticleViewProps) {
  const articleBlocks = parseArticleContent(post.content);
  const publishedAt = post.publishedAt || post.createdAt;
  const imageUrl = post.coverImageUrl || defaultOgImage.url;
  const imageAlt = post.coverImageAlt || post.title || defaultOgImage.alt;

  return (
    <section className="section">
      <div className="container">
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
              <span>{formatDate(publishedAt)}</span>
              <span>{post.readTime} min read</span>
              {post.focusKeyword ? <span>Keyword: {post.focusKeyword}</span> : null}
            </div>
            {previewNote ? <p className="form-note">{previewNote}</p> : null}
          </div>

          <div className="panel">
            <Image
              src={imageUrl}
              alt={imageAlt}
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
