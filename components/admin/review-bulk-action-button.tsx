"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReviewBulkActionButtonProps = {
  formId: string;
  productSlug: string;
  intent: "approve" | "mark-verified" | "mark-unverified" | "delete";
  label: string;
  className: string;
};

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { error?: string };
  return candidate.error || fallback;
}

function getSelectedReviewIds(formId: string) {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="reviewIds"][form="${formId}"]:checked`
    )
  ).map((checkbox) => checkbox.value);
}

export function ReviewBulkActionButton({
  formId,
  productSlug,
  intent,
  label,
  className
}: ReviewBulkActionButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      setMessage(null);
      const reviewIds = getSelectedReviewIds(formId);

      if (reviewIds.length === 0) {
        setMessage("Select at least one review.");
        return;
      }

      try {
        const response = await fetch("/api/admin/reviews/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productSlug,
            intent,
            reviewIds
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload, "Bulk review action failed."));
        }

        setMessage("Done");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Bulk review action failed.");
      }
    });
  };

  return (
    <div className="stack-row">
      <button type="button" className={className} onClick={handleClick} disabled={isPending} aria-busy={isPending}>
        {isPending ? "Working..." : label}
      </button>
      {message ? <span className={message === "Done" ? "form-note" : "form-note notice--warning"}>{message}</span> : null}
    </div>
  );
}
