"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type OmbClaimInlineEditorProps = {
  claimId: string;
  initialGiftSent: boolean;
  initialAdminNote: string;
};

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "OMB claim update failed.";
  }

  const candidate = payload as { error?: string };
  return candidate.error || "OMB claim update failed.";
}

export function OmbClaimInlineEditor({
  claimId,
  initialGiftSent,
  initialAdminNote
}: OmbClaimInlineEditorProps) {
  const router = useRouter();
  const [giftSent, setGiftSent] = useState(initialGiftSent);
  const [adminNote, setAdminNote] = useState(initialAdminNote);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch("/api/admin/omb-claims/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: claimId,
            giftSent,
            adminNote
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload));
        }

        setMessage("Saved");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "OMB claim update failed.");
      }
    });
  };

  return (
    <div className="admin-table__cell-stack">
      <label className="admin-table__checkbox-label">
        <input
          type="checkbox"
          checked={giftSent}
          onChange={(event) => setGiftSent(event.target.checked)}
        />
        <span>{giftSent ? "Gift sent" : "Gift pending"}</span>
      </label>
      <textarea
        className="admin-table__textarea"
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
      />
      <div className="stack-row">
        <button type="button" className="button button--primary" onClick={handleSave} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Saving..." : "Save"}
        </button>
        {message ? (
          <span className={message === "Saved" ? "form-note" : "form-note notice--warning"}>{message}</span>
        ) : null}
      </div>
    </div>
  );
}
