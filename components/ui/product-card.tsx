import Image from "next/image";
import { formatCurrency, getSavingsCents } from "@/lib/format";
import { toGoogleAnalyticsItem } from "@/lib/analytics";
import { isLocalProductMediaUrl } from "@/lib/media-url";
import type { ProductRecord } from "@/lib/types";
import { AiGeneratedPersonBadge } from "@/components/ui/ai-generated-person-badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { TrackedProductLink } from "@/components/analytics/tracked-product-link";

type ProductCardProps = {
  product: ProductRecord;
};

export function ProductCard({ product }: ProductCardProps) {
  const savingsCents = getSavingsCents(product.compareAtPriceCents, product.priceCents);
  const analyticsItem = toGoogleAnalyticsItem(product, 1, {
    item_list_id: "product_collection",
    item_list_name: "Product collection"
  });

  return (
    <article className="product-card">
      <TrackedProductLink
        href={`/shop/${product.slug}`}
        item={analyticsItem}
        className="product-card__image-link"
        aria-label={product.name}
      >
        <div className="product-card__image-wrap">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={520}
            height={520}
            className="product-card__image"
            sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 31vw"
            quality={75}
            unoptimized={isLocalProductMediaUrl(product.imageUrl)}
          />
          <AiGeneratedPersonBadge src={product.imageUrl} />
        </div>
      </TrackedProductLink>
      <div className="product-card__content">
        <div className="product-card__meta">
          <span>{product.category}</span>
          <span>{product.pointsReward} pts</span>
        </div>
        <RatingStars
          rating={product.averageRating}
          reviewCount={product.reviewCount}
          showCount
          size="sm"
        />
        <h3>{product.name}</h3>
        <p>{product.shortDescription}</p>
        <div className="product-card__bottom">
          <div className="product-price-stack">
            {product.compareAtPriceCents ? (
              <span className="product-price-stack__original">
                {formatCurrency(product.compareAtPriceCents, product.currency)}
              </span>
            ) : null}
            <strong className="product-price-stack__sale">
              {formatCurrency(product.priceCents, product.currency)}
            </strong>
            {savingsCents > 0 ? (
              <span className="product-price-stack__off">
                {formatCurrency(savingsCents, product.currency)} Off
              </span>
            ) : null}
          </div>
          <TrackedProductLink href={`/shop/${product.slug}`} item={analyticsItem}>
            View details
          </TrackedProductLink>
        </div>
      </div>
    </article>
  );
}
