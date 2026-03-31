import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";
import { getPublishedReviewById } from "@/lib/queries";
import { getReviewPath, getReviewUrl } from "@/lib/review-links";
import { defaultOgImage } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

function buildReviewDescription(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 155) {
    return normalized;
  }

  return `${normalized.slice(0, 152).trimEnd()}...`;
}

export async function generateMetadata({ params }: ReviewDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const review = await getPublishedReviewById(id);

  if (!review) {
    return {
      title: "Review not found"
    };
  }

  const productName = review.productName ?? "Neatique skincare";
  const title = `${productName} review by ${review.displayName}`;
  const description = buildReviewDescription(review.content);

  return {
    title,
    description,
    alternates: {
      canonical: getReviewPath(review.id)
    },
    keywords: [productName, `${productName} review`, "customer review", "Neatique review"],
    openGraph: {
      type: "article",
      title: `${title} | ${siteConfig.title}`,
      description,
      url: getReviewUrl(review.id),
      publishedTime: review.reviewDate.toISOString(),
      images: [defaultOgImage]
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.title}`,
      description,
      images: [defaultOgImage.url]
    }
  };
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const review = await getPublishedReviewById(id);

  if (!review) {
    notFound();
  }

  const productName = review.productName ?? "Product";
  const productPath = review.productSlug ? `/shop/${review.productSlug}` : "/shop";

  return (
    <section className="section section--tight">
      <div className="container">
        <div className="review-detail-shell">
          <div className="review-detail-breadcrumb">
            <Link href={productPath}>Back to {productName}</Link>
          </div>

          <article className="panel review-detail-card">
            <div className="review-detail-card__hero">
              <div className="review-detail-card__copy">
                <p className="eyebrow">Customer review</p>
                <h1>{review.title}</h1>
                <p>
                  Shared for <Link href={productPath}>{productName}</Link>
                </p>
              </div>
              <div className="review-detail-card__rating">
                <RatingStars rating={review.rating} size="lg" />
                <span>{review.rating}/5</span>
              </div>
            </div>

            <div className="review-detail-card__meta">
              <span>{review.displayName}</span>
              <span>{formatDate(review.reviewDate)}</span>
              {review.verifiedPurchase ? <span>Verified purchase</span> : null}
            </div>

            <div className="review-detail-card__body">
              <p>{review.content}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
