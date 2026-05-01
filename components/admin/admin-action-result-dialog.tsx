"use client";

import { useState } from "react";

type AdminActionResultDialogMessage = {
  title: string;
  description: string;
  tone?: "success" | "danger" | "warning";
};

type AdminActionResultDialogProps = {
  status?: string | null;
  messages: Record<string, AdminActionResultDialogMessage>;
};

export function AdminActionResultDialog({
  status,
  messages
}: AdminActionResultDialogProps) {
  const message = status ? messages[status] : null;
  const [open, setOpen] = useState(Boolean(message));

  if (!message || !open) {
    return null;
  }

  const tone = message.tone || "success";
  const closeDialog = () => {
    setOpen(false);

    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <div className="admin-result-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-result-dialog-title">
      <div className={`admin-result-dialog__card admin-result-dialog__card--${tone}`}>
        <p className="eyebrow">{tone === "danger" ? "Needs attention" : "Result"}</p>
        <h3 id="admin-result-dialog-title">{message.title}</h3>
        <p>{message.description}</p>
        <button type="button" className="button button--primary" onClick={closeDialog}>
          Close
        </button>
      </div>
    </div>
  );
}
