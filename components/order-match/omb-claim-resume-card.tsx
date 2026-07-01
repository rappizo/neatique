"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildOmbClaimProgressHref,
  isFreshOmbClaimProgressSnapshot,
  OMB_CLAIM_PROGRESS_STORAGE_KEY,
  type OmbClaimProgressSnapshot
} from "@/lib/order-match-progress";
import { cn } from "@/lib/utils";

type OmbClaimResumeCardProps = {
  storageKey?: string;
  hiddenClaimId?: string | null;
  className?: string;
  wrapInPageSection?: boolean;
};

function readStoredProgress(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;

    if (isFreshOmbClaimProgressSnapshot(parsed)) {
      return parsed;
    }

    if (raw) {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }

  return null;
}

export function OmbClaimResumeCard({
  storageKey = OMB_CLAIM_PROGRESS_STORAGE_KEY,
  hiddenClaimId,
  className,
  wrapInPageSection = false
}: OmbClaimResumeCardProps) {
  const [progress, setProgress] = useState<OmbClaimProgressSnapshot | null>(null);

  useEffect(() => {
    const storedProgress = readStoredProgress(storageKey);
    setProgress(storedProgress);
  }, [storageKey]);

  if (!progress || progress.claimId === hiddenClaimId) {
    return null;
  }

  const href = buildOmbClaimProgressHref(progress);
  const stepLabel = progress.step === "last-step" ? "last step" : "step 2";

  function clearProgress() {
    window.localStorage.removeItem(storageKey);
    setProgress(null);
  }

  const card = (
    <section className={cn("omb-resume-card", className)} aria-label="Continue unfinished OMB claim">
      <div>
        <p className="eyebrow">Unfinished OMB claim</p>
        <h2>Continue where you left off.</h2>
        <p>
          We found your unfinished {progress.platformLabel} claim for order {progress.orderId}.
          You can return to the {stepLabel} without starting over.
        </p>
      </div>
      <div className="stack-row">
        <Link href={href} className="button button--primary">
          Continue claim
        </Link>
        <button type="button" className="button button--secondary" onClick={clearProgress}>
          Start over
        </button>
      </div>
    </section>
  );

  if (wrapInPageSection) {
    return (
      <section className="section section--compact">
        <div className="container">{card}</div>
      </section>
    );
  }

  return card;
}

export function ClearOmbClaimProgress({
  storageKey = OMB_CLAIM_PROGRESS_STORAGE_KEY
}: {
  storageKey?: string;
}) {
  useEffect(() => {
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return null;
}
