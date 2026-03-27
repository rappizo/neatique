"use client";

import { useEffect, useState } from "react";

export type ProductCustomerVoiceVideo = {
  id: string;
  creator: string;
  title: string;
  note: string;
};

type ProductCustomerVoiceSliderProps = {
  eyebrow?: string;
  heading: string;
  description: string;
  videos: ProductCustomerVoiceVideo[];
};

export function ProductCustomerVoiceSlider({
  eyebrow = "Customer voice",
  heading,
  description,
  videos
}: ProductCustomerVoiceSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || videos.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % videos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [paused, videos.length]);

  if (videos.length === 0) {
    return null;
  }

  const activeVideo = videos[currentIndex];

  return (
    <div
      className="social-proof social-proof--product"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="social-proof__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{heading}</h3>
        <p>{description}</p>
        <div className="social-proof__nav">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              className={`social-proof__pill ${index === currentIndex ? "social-proof__pill--active" : ""}`}
              onClick={() => setCurrentIndex(index)}
            >
              {video.creator}
            </button>
          ))}
        </div>
      </div>

      <div className="social-proof__player">
        <div className="social-proof__embed">
          <iframe
            key={activeVideo.id}
            src={`https://www.tiktok.com/player/v1/${activeVideo.id}`}
            title={activeVideo.title}
            allow="fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <div className="social-proof__meta">
          <strong>{activeVideo.creator}</strong>
          <h4>{activeVideo.title}</h4>
          <p>{activeVideo.note}</p>
          <a
            href={`https://www.tiktok.com/${activeVideo.creator}/video/${activeVideo.id}`}
            target="_blank"
            rel="noreferrer"
            className="link-inline"
          >
            Watch on TikTok
          </a>
        </div>
      </div>
    </div>
  );
}
