"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EmailAudienceType } from "@/lib/types";

type EmailAudienceActionButtonsProps = {
  audienceType: EmailAudienceType;
  customListIds?: string | null;
  detailHref: string;
};

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { error?: string };
  return candidate.error || fallback;
}

export function EmailAudienceActionButtons({
  audienceType,
  customListIds,
  detailHref
}: EmailAudienceActionButtonsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"import" | "sync" | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = (action: "import" | "sync") => {
    startTransition(async () => {
      setPendingAction(action);
      setMessage(null);

      try {
        const response = await fetch(
          action === "import"
            ? "/api/admin/email-marketing/import-audience"
            : "/api/admin/email-marketing/sync-audience",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              audienceType,
              customListIds: customListIds || null
            })
          }
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          throw new Error(
            extractErrorMessage(
              payload,
              action === "import" ? "Brevo import failed." : "Brevo sync failed."
            )
          );
        }

        const payload = (await response.json().catch(() => null)) as
          | {
              imported?: number;
              uniqueImported?: number;
              failed?: number;
              synced?: number;
              total?: number;
            }
          | null;

        setMessage(
          action === "import"
            ? `Imported ${payload?.uniqueImported ?? payload?.imported ?? 0} contacts.`
            : `Synced ${payload?.synced ?? 0} of ${payload?.total ?? 0} contacts.`
        );
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Audience action failed.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="stack-row stack-row--wrap">
      <Link href={detailHref} className="button button--ghost">
        View emails
      </Link>
      <button
        type="button"
        className="button button--secondary"
        onClick={() => runAction("import")}
        disabled={isPending}
        aria-busy={isPending && pendingAction === "import"}
      >
        {isPending && pendingAction === "import" ? "Importing..." : "Import from Brevo"}
      </button>
      <button
        type="button"
        className="button button--primary"
        onClick={() => runAction("sync")}
        disabled={isPending}
        aria-busy={isPending && pendingAction === "sync"}
      >
        {isPending && pendingAction === "sync" ? "Syncing..." : "Sync to Brevo"}
      </button>
      {message ? <span className={message.includes("failed") ? "form-note notice--warning" : "form-note"}>{message}</span> : null}
    </div>
  );
}
