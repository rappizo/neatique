import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getPostBySlug } from "@/lib/queries";

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

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt
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
            <Image src={post.coverImageUrl} alt={post.title} width={1200} height={740} />
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
