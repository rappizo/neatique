"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(images[0]);

  return (
    <div className="product-detail__media-wrap">
      <div className="product-detail__media product-detail__media--square">
        <Image src={activeImage} alt={alt} width={900} height={900} className="product-detail__media-image" />
      </div>
      {images.length > 1 ? (
        <div className="product-gallery">
          {images.map((imagePath, index) => (
            <button
              key={imagePath}
              type="button"
              onClick={() => setActiveImage(imagePath)}
              className={cn(
                "product-gallery__item",
                activeImage === imagePath && "product-gallery__item--active"
              )}
              aria-label={`View image ${index + 1}`}
            >
              <Image src={imagePath} alt={`${alt} thumbnail ${index + 1}`} width={220} height={220} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
