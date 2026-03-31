import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getPostBySlug } from "@/lib/queries";
import { toAbsoluteUrl } from "@/lib/seo";
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
  const absoluteImageUrl = toAbsoluteUrl(post.coverImageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: `/beauty-tips/${post.slug}`
    },
    keywords: [post.title, post.category, "skincare tips", "Neatique Beauty Tips"],
    openGraph: {
      type: "article",
      title: `${title} | ${siteConfig.title}`,
      description,
      url: `${siteConfig.url}/beauty-tips/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      images: [
        {
          url: absoluteImageUrl,
          alt: post.title
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

  const paragraphs = post.content.split("\n\n");

  return (
    <section className="section">
      <div className="container">
        <div className="article-shell">
          <div className="article-hero">
            <p className="eyebrow">{post.category}</p>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <div className="article-meta">
              <span>{formatDate(post.publishedAt)}</span>
              <span>{post.readTime} min read</span>
            </div>
          </div>
          <div className="panel">
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              width={1200}
              height={740}
              sizes="(max-width: 720px) 100vw, (max-width: 1200px) 92vw, 1200px"
              quality={75}
            />
          </div>
          <div className="article-content">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
