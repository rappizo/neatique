"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MailboxFolderKey } from "@/lib/admin-mailbox";

type MailboxReadToggleButtonProps = {
  uid: number;
  initialUnread: boolean;
  folder: MailboxFolderKey;
  className?: string;
};

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Mailbox update failed.";
  }

  const candidate = payload as { error?: string };
  return candidate.error || "Mailbox update failed.";
}

export function MailboxReadToggleButton({
  uid,
  initialUnread,
  folder,
  className = "button button--ghost"
}: MailboxReadToggleButtonProps) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const nextUnread = !unread;
      const previous = unread;

      setError(null);
      setUnread(nextUnread);

      try {
        const response = await fetch("/api/admin/email/read-state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            uid,
            unread: nextUnread,
            folder
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(extractErrorMessage(payload));
        }

        router.refresh();
      } catch (requestError) {
        setUnread(previous);
        setError(requestError instanceof Error ? requestError.message : "Mailbox update failed.");
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
        {isPending ? "Saving..." : unread ? "Mark read" : "Mark unread"}
      </button>
      {error ? <span className="form-note notice--warning">{error}</span> : null}
    </div>
  );
}
