"use client";

import dynamic from "next/dynamic";

const SocialProofSlider = dynamic(
  () => import("@/components/home/social-proof-slider").then((module) => module.SocialProofSlider),
  {
    ssr: false,
    loading: () => (
      <div className="social-proof social-proof--placeholder">
        <div className="social-proof__copy">
          <p className="eyebrow">Social proof</p>
          <h3>Creator routine videos are loading.</h3>
          <p>
            We are preparing the TikTok player so it does not compete with the first screen on
            mobile.
          </p>
        </div>
        <div className="social-proof__player social-proof__player--placeholder" />
      </div>
    )
  }
);

export function SocialProofSliderDeferred() {
  return <SocialProofSlider />;
}
