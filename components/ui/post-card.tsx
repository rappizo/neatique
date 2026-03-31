import Image from "next/image";
import Link from "next/link";
import type { BeautyPostRecord } from "@/lib/types";
import { formatDate } from "@/lib/format";

type PostCardProps = {
  post: BeautyPostRecord;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="post-card">
      <div className="post-card__image-wrap">
        <Image
          src={post.coverImageUrl}
          alt={post.title}
          width={640}
          height={420}
          className="post-card__image"
          sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 31vw"
          quality={75}
        />
      </div>
      <div className="post-card__content">
        <div className="post-card__meta">
          <span>{post.category}</span>
          <span>{post.readTime} min read</span>
          <span>{formatDate(post.publishedAt)}</span>
        </div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <Link href={`/beauty-tips/${post.slug}`}>Read article</Link>
      </div>
    </article>
  );
}
