"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { buildSiteImageUrl } from "@/lib/site-media";

const slides = [
  {
    title: "A soft, polished start to your everyday routine",
    description:
      "Discover silky textures and glow-focused care made to leave skin looking smooth, fresh, and beautifully comfortable.",
    href: "/shop/pdrn-serum",
    middleImage: buildSiteImageUrl("home-banner", "1.jpg"),
    rightImage: buildSiteImageUrl("home-banner", "3.jpg")
  },
  {
    title: "Daily hydration that feels light, calm, and dewy",
    description:
      "Explore formulas that wrap the skin in moisture and help create a softer, more luminous finish from morning to night.",
    href: "/shop/snail-mucin-serum",
    middleImage: buildSiteImageUrl("home-banner", "4.jpg"),
    rightImage: buildSiteImageUrl("home-banner", "6.jpg")
  },
  {
    title: "Comforting care for skin that craves softness and glow",
    description:
      "Build a routine with serums and creams designed to feel elegant, easy to layer, and lovely to come back to every day.",
    href: "/shop/snail-mucin-cream",
    middleImage: buildSiteImageUrl("home-banner", "7.jpg"),
    rightImage: buildSiteImageUrl("home-banner", "8.jpg")
  }
];

export function HomeBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section className="home-banner">
      <div className="container">
        <div
          className="custom-slider-container"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="custom-slider-wrapper"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {slides.map((slide) => (
              <div key={slide.title} className="custom-slide">
                <div className="slide-part text-part">
                  <div className="text-content">
                    <p className="eyebrow">Neatique Beauty</p>
                    <h3>{slide.title}</h3>
                    <p>{slide.description}</p>
                    <Link href={slide.href} className="shop-btn">
                      SHOP NOW
                    </Link>
                  </div>
                </div>
                <div className="slide-part image-part middle-img">
                  <Image src={slide.middleImage} alt={slide.title} width={560} height={760} />
                </div>
                <div className="slide-part image-part right-img">
                  <Image src={slide.rightImage} alt={`${slide.title} detail`} width={560} height={760} />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="slider-nav prev-btn"
            onClick={() => {
              setCurrentIndex((current) => (current - 1 + slides.length) % slides.length);
              setPaused(false);
            }}
            aria-label="Previous slide"
          >
            &#10094;
          </button>
          <button
            type="button"
            className="slider-nav next-btn"
            onClick={() => {
              setCurrentIndex((current) => (current + 1) % slides.length);
              setPaused(false);
            }}
            aria-label="Next slide"
          >
            &#10095;
          </button>
        </div>
      </div>
    </section>
  );
}
