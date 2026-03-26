import Image from "next/image";
import Link from "next/link";
import { formatCurrency, getSavingsCents } from "@/lib/format";
import type { ProductRecord } from "@/lib/types";
import { RatingStars } from "@/components/ui/rating-stars";

type ProductCardProps = {
  product: ProductRecord;
};

export function ProductCard({ product }: ProductCardProps) {
  const savingsCents = getSavingsCents(product.compareAtPriceCents, product.priceCents);

  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-card__image-link" aria-label={product.name}>
        <div className="product-card__image-wrap">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={520}
            height={520}
            className="product-card__image"
          />
        </div>
      </Link>
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
          <Link href={`/shop/${product.slug}`}>View details</Link>
        </div>
      </div>
    </article>
  );
}
