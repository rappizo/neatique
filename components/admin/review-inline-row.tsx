"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";
import type { ProductReviewRecord, ReviewStatus } from "@/lib/types";

type ReviewInlineRowProps = {
  review: ProductReviewRecord;
  productSlug: string;
  bulkFormId: string;
};

function toDateInputValue(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { error?: string };
  return candidate.error || fallback;
}

export function ReviewInlineRow({ review, productSlug, bulkFormId }: ReviewInlineRowProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(review.displayName);
  const [rating, setRating] = useState(String(review.rating));
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [verifiedPurchase, setVerifiedPurchase] = useState(review.verifiedPurchase);
  const [title, setTitle] = useState(review.title);
  const [content, setContent] = useState(review.content);
  const [adminNotes, setAdminNotes] = useState(review.adminNotes ?? "");
  const [reviewDate, setReviewDate] = useState(toDateInputValue(review.reviewDate));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formattedDate = useMemo(() => formatDate(new Date(reviewDate)), [reviewDate]);

  const runAction = (intent: "update" | "approve" | "delete", fallbackError: string) => {
    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch("/api/admin/reviews/item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            intent,
            id: review.id,
            productSlug,
            rating: Number.parseInt(rating, 10),
            title,
            content,
            displayName,
            reviewDate,
            status,
            verifiedPurchase,
            adminNotes
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload, fallbackError));
        }

        setMessage(intent === "delete" ? "Deleted" : intent === "approve" ? "Approved" : "Saved");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : fallbackError);
      }
    });
  };

  return (
    <tr>
      <td>
        <label className="admin-table__checkbox-label">
          <input type="checkbox" name="reviewIds" value={review.id} form={bulkFormId} />
          <span>Select</span>
        </label>
      </td>
      <td>
        <div className="admin-table__cell-stack">
          <strong>{formattedDate}</strong>
          <span className="form-note">{review.customerEmail || "No customer record"}</span>
          <input
            className="admin-table__input"
            name="reviewDate"
            type="date"
            value={reviewDate}
            onChange={(event) => setReviewDate(event.target.value)}
          />
        </div>
      </td>
      <td>
        <input className="admin-table__input" name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </td>
      <td>
        <div className="admin-table__rating-cell">
          <input
            className="admin-table__input admin-table__input--xs"
            name="rating"
            type="number"
            min="1"
            max="5"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          />
          <RatingStars rating={Math.max(1, Math.min(5, Number.parseInt(rating, 10) || review.rating))} size="sm" />
        </div>
      </td>
      <td>
        <select className="admin-table__select" name="status" value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus)}>
          <option value="PENDING">PENDING</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="HIDDEN">HIDDEN</option>
        </select>
      </td>
      <td>
        <span className="pill">{review.source}</span>
      </td>
      <td>
        <label className="admin-table__checkbox-label">
          <input
            type="checkbox"
            name="verifiedPurchase"
            checked={verifiedPurchase}
            onChange={(event) => setVerifiedPurchase(event.target.checked)}
          />
          <span>Verified</span>
        </label>
      </td>
      <td>
        <input className="admin-table__input" name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </td>
      <td>
        <textarea className="admin-table__textarea" name="content" value={content} onChange={(event) => setContent(event.target.value)} />
      </td>
      <td>
        <textarea className="admin-table__textarea" name="adminNotes" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
      </td>
      <td className="admin-table__actions">
        <button type="button" className="button button--primary" onClick={() => runAction("update", "Review update failed.")} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Saving..." : "Save"}
        </button>

        {status !== "PUBLISHED" ? (
          <button type="button" className="button button--secondary" onClick={() => runAction("approve", "Review approval failed.")} disabled={isPending}>
            Approve
          </button>
        ) : null}

        <button type="button" className="button button--ghost" onClick={() => runAction("delete", "Review delete failed.")} disabled={isPending}>
          Delete
        </button>
        {message ? <span className={message === "Saved" || message === "Approved" || message === "Deleted" ? "form-note" : "form-note notice--warning"}>{message}</span> : null}
      </td>
    </tr>
  );
}
