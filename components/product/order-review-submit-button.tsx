"use client";

import { useFormStatus } from "react-dom";

export function OrderReviewSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="button button--primary order-review-submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Submitting your review..." : "Submit verified review"}
    </button>
  );
}
