import React, { type ReactNode } from "react";

export const PRODUCT_CONTENT_SECTION_ORDER = [
  "visual-story",
  "product-details",
  "routine",
  "faq",
  "collection-exploration",
  "transparency",
  "reviews",
  "discovery-intro",
  "related-products",
  "related-guides"
] as const;

export type ProductContentSection = (typeof PRODUCT_CONTENT_SECTION_ORDER)[number];

type ProductContentFlowProps = {
  slots: Record<ProductContentSection, ReactNode>;
};

export function ProductContentFlow({ slots }: ProductContentFlowProps) {
  return (
    <div className="product-content-flow">
      {PRODUCT_CONTENT_SECTION_ORDER.map((section) => (
        <div
          key={section}
          className="product-content-slot"
          data-product-section={section}
        >
          {slots[section]}
        </div>
      ))}
    </div>
  );
}
