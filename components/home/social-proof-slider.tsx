"use client";

import { useEffect, useState } from "react";

const videos = [
  {
    id: "7616409897097334029",
    creator: "@maddisonilene",
    title: "A glow-first serum moment",
    note: "A creator spotlight on soft glow, silky layering, and that polished skin finish."
  },
  {
    id: "7619033906880302367",
    creator: "@camilacastaneda99",
    title: "Daily routine favorite",
    note: "A quick routine-style review showing how easily the texture fits into everyday skincare."
  },
  {
    id: "7619379257407474974",
    creator: "@yennceto",
    title: "Comfort and dew in one step",
    note: "A soft-focus beauty clip showing a dewy, comfortable finish in motion."
  },
  {
    id: "7617252288888835359",
    creator: "@gracesahm",
    title: "Fresh glow with a polished finish",
    note: "A creator moment that brings softness, glow, and daily-routine appeal to the page."
  },
  {
    id: "7618994711973399839",
    creator: "@ninlama2020",
    title: "Hydration that still feels light",
    note: "A quick beauty clip that helps shoppers see texture and finish before they tap into the product."
  }
];

export function SocialProofSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % videos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [paused]);

  const activeVideo = videos[currentIndex];

  return (
    <div
      className="social-proof"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="social-proof__copy">
        <p className="eyebrow">Social proof</p>
        <h3>See how Neatique looks in real routines.</h3>
        <p>
          Press play to watch texture, finish, and everyday routine moments in motion.
        </p>
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
