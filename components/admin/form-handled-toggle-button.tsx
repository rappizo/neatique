"use client";

import { useState, useTransition } from "react";

type FormHandledToggleButtonProps = {
  submissionId: string;
  formKey: string;
  initialHandled: boolean;
  className?: string;
};

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Update failed.";
  }

  const candidate = payload as { error?: string };
  return candidate.error || "Update failed.";
}

export function FormHandledToggleButton({
  submissionId,
  formKey,
  initialHandled,
  className = "button button--secondary"
}: FormHandledToggleButtonProps) {
  const [handled, setHandled] = useState(initialHandled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const nextHandled = !handled;
      const previous = handled;

      setError(null);
      setHandled(nextHandled);

      try {
        const response = await fetch("/api/admin/forms/handled", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: submissionId,
            formKey,
            nextHandled
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload));
        }
      } catch (requestError) {
        setHandled(previous);
        setError(requestError instanceof Error ? requestError.message : "Update failed.");
      }
    });
  };

  return (
    <div className="stack-row">
      <button
        type="button"
        className={className}
        disabled={isPending}
        aria-busy={isPending}
        onClick={handleToggle}
      >
        {isPending ? "Saving..." : handled ? "Mark new" : "Mark handled"}
      </button>
      {error ? <span className="form-note notice--warning">{error}</span> : null}
    </div>
  );
}
