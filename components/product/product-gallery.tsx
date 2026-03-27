"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const activeImage = images[activeIndex] ?? images[0];

  function showNextImage() {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  function showPreviousImage() {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function scrollGallery(direction: "prev" | "next") {
    const scroller = galleryRef.current;

    if (!scroller) {
      return;
    }

    const amount = Math.max(180, Math.round(scroller.clientWidth * 0.68));
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth"
    });
  }

  return (
    <div className="product-detail__media-wrap">
      <div className="product-detail__media product-detail__media--square">
        <Image src={activeImage} alt={alt} width={900} height={900} className="product-detail__media-image" />
        {images.length > 1 ? (
          <div className="product-detail__media-nav">
            <button
              type="button"
              onClick={showPreviousImage}
              className="product-detail__media-nav-button"
              aria-label="View previous image"
            >
              &#10094;
            </button>
            <button
              type="button"
              onClick={showNextImage}
              className="product-detail__media-nav-button"
              aria-label="View next image"
            >
              &#10095;
            </button>
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="product-gallery-wrap">
          <button
            type="button"
            className="product-gallery__nav product-gallery__nav--prev"
            onClick={() => scrollGallery("prev")}
            aria-label="Scroll product thumbnails left"
          >
            &#10094;
          </button>
          <div className="product-gallery" ref={galleryRef}>
            {images.map((imagePath, index) => (
              <button
                key={imagePath}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "product-gallery__item",
                  activeIndex === index && "product-gallery__item--active"
                )}
                aria-label={`View image ${index + 1}`}
                aria-pressed={activeIndex === index}
              >
                <Image src={imagePath} alt={`${alt} thumbnail ${index + 1}`} width={220} height={220} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="product-gallery__nav product-gallery__nav--next"
            onClick={() => scrollGallery("next")}
            aria-label="Scroll product thumbnails right"
          >
            &#10095;
          </button>
        </div>
      ) : null}
    </div>
  );
}
