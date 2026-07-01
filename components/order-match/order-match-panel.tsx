"use client";

import { useMemo, useState } from "react";
import { OmbClaimResumeCard } from "@/components/order-match/omb-claim-resume-card";
import type { OrderMatchPlatform } from "@/lib/order-match";
import { orderMatchPlatforms } from "@/lib/order-match";

type OrderMatchInitialValues = {
  claimId?: string;
  orderId?: string;
  name?: string;
  email?: string;
  phone?: string | null;
};

type OrderMatchPanelProps = {
  initialPlatform: OrderMatchPlatform;
  initialValues?: OrderMatchInitialValues;
  eyebrow?: string;
  title?: string;
  submitAction?: string;
  resumeStorageKey?: string;
};

export function OrderMatchPanel({
  initialPlatform,
  initialValues,
  eyebrow = "OMB Process",
  title = "2 Simple Processes to Finished The OMB Process",
  submitAction = "/api/om",
  resumeStorageKey
}: OrderMatchPanelProps) {
  const [activePlatformKey, setActivePlatformKey] = useState<OrderMatchPlatform>(initialPlatform);

  const activePlatform =
    useMemo(
      () =>
        orderMatchPlatforms.find((platform) => platform.key === activePlatformKey) ??
        orderMatchPlatforms[0],
      [activePlatformKey]
    );

  return (
    <section className="om-shell">
      <div className="om-shell__header">
        <div className="section-heading">
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="om-shell__tabs" role="tablist" aria-label="Store tabs">
        {orderMatchPlatforms.map((platform) => (
          <button
            key={platform.key}
            type="button"
            role="tab"
            aria-selected={platform.key === activePlatform.key}
            className={`om-shell__tab ${platform.key === activePlatform.key ? "om-shell__tab--active" : ""}`}
            onMouseEnter={() => setActivePlatformKey(platform.key)}
            onFocus={() => setActivePlatformKey(platform.key)}
            onClick={() => setActivePlatformKey(platform.key)}
          >
            {platform.label}
          </button>
        ))}
      </div>

      <div className="om-shell__body">
        {resumeStorageKey ? (
          <OmbClaimResumeCard storageKey={resumeStorageKey} hiddenClaimId={initialValues?.claimId} />
        ) : null}

        <form action={submitAction} method="post" className="contact-form">
          {initialValues?.claimId ? (
            <input type="hidden" name="claimId" value={initialValues.claimId} />
          ) : null}
          <input type="hidden" name="platform" value={activePlatform.key} />

          <div className="form-row">
            <div className="field">
              <label htmlFor="order-id">
                {activePlatform.orderIdLabel} <span className="field__required">(Required)</span>
              </label>
              <input
                id="order-id"
                name="orderId"
                placeholder={activePlatform.orderIdPlaceholder}
                defaultValue={initialValues?.orderId ?? ""}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="om-name">
                Name <span className="field__required">(Required)</span>
              </label>
              <input
                id="om-name"
                name="name"
                autoComplete="name"
                defaultValue={initialValues?.name ?? ""}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="om-email">
                Email <span className="field__required">(Required)</span>
              </label>
              <input
                id="om-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={initialValues?.email ?? ""}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="om-phone">Phone</label>
              <input
                id="om-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={initialValues?.phone ?? ""}
              />
            </div>
          </div>

          <button type="submit" className="button button--primary om-shell__submit">
            Submit
          </button>
        </form>
      </div>
    </section>
  );
}
