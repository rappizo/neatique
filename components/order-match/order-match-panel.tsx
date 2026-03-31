"use client";

import { useMemo, useState } from "react";
import type { OrderMatchPlatform } from "@/lib/order-match";
import { orderMatchPlatforms } from "@/lib/order-match";

type OrderMatchPanelProps = {
  initialPlatform: OrderMatchPlatform;
  eyebrow?: string;
  title?: string;
  submitAction?: string;
};

export function OrderMatchPanel({
  initialPlatform,
  eyebrow = "OMB Process",
  title = "2 Simple Processes to Finished The OMB Process",
  submitAction = "/api/om"
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
        <form action={submitAction} method="post" className="contact-form">
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
                required
              />
            </div>
            <div className="field">
              <label htmlFor="om-name">
                Name <span className="field__required">(Required)</span>
              </label>
              <input id="om-name" name="name" autoComplete="name" required />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="om-email">
                Email <span className="field__required">(Required)</span>
              </label>
              <input id="om-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="om-phone">Phone</label>
              <input id="om-phone" name="phone" type="tel" autoComplete="tel" />
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
