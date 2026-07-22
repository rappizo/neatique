"use client";

import Image from "next/image";
import { useState } from "react";
import { trackGoogleAnalyticsEvent } from "@/components/analytics/analytics-event";
import type { ProductCustomerVoiceVideo } from "@/components/product/product-customer-voice-slider";

type ProductCustomerVideoGridProps = {
  eyebrow?: string;
  heading: string;
  description: string;
  videos: ProductCustomerVoiceVideo[];
};

function getOriginalVideoUrl(video: ProductCustomerVoiceVideo) {
  return video.url ?? `https://www.tiktok.com/${video.creator}/video/${video.id}`;
}

export function ProductCustomerVideoGrid({
  eyebrow = "Real creator routines",
  heading,
  description,
  videos
}: ProductCustomerVideoGridProps) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="product-page-section product-customer-video-section">
      <div className="section-heading">
        <p className="section-heading__eyebrow">{eyebrow}</p>
        <h2>{heading}</h2>
        <p className="section-heading__description">{description}</p>
      </div>

      <div className="product-customer-video-grid">
        {videos.map((video, index) => {
          const isActive = activeVideoId === video.id;
          const originalVideoUrl = getOriginalVideoUrl(video);

          return (
            <article key={video.id} className="product-customer-video-card">
              <div className="product-customer-video-card__media">
                {isActive ? (
                  <iframe
                    src={`https://www.tiktok.com/player/v1/${video.id}?autoplay=1&rel=0`}
                    title={video.title}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <button
                    type="button"
                    className="product-customer-video-card__play"
                    aria-label={`Play ${video.title}`}
                    onClick={() => {
                      setActiveVideoId(video.id);
                      trackGoogleAnalyticsEvent("play_embedded_video", {
                        platform: "TikTok",
                        video_id: video.id
                      });
                    }}
                  >
                    {video.posterSrc ? (
                      <Image
                        src={video.posterSrc}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 620px) calc(100vw - 64px), (max-width: 900px) 44vw, 30vw"
                        className="product-customer-video-card__poster"
                      />
                    ) : null}
                    <span className="product-customer-video-card__number">
                      TikTok {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="product-customer-video-card__play-icon" aria-hidden="true">
                      <svg viewBox="0 0 64 64" role="presentation">
                        <circle cx="32" cy="32" r="30" />
                        <path d="M26 20.5 46 32 26 43.5Z" />
                      </svg>
                    </span>
                    <strong>Play video</strong>
                    <span>Loads only after you click.</span>
                  </button>
                )}
              </div>

              <div className="product-customer-video-card__body">
                <p className="eyebrow">{video.creator}</p>
                <h3>{video.title}</h3>
                <p>{video.note}</p>
                <a
                  href={originalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary product-customer-video-card__link"
                  onClick={() =>
                    trackGoogleAnalyticsEvent("select_external_social", {
                      platform: "TikTok",
                      creator: video.creator,
                      video_id: video.id,
                      link_url: originalVideoUrl,
                      outbound: true
                    })
                  }
                >
                  Watch original on TikTok
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
