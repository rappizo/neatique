"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  modalTitle: string;
  modalDescription: string;
  disabled?: boolean;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className = "button button--primary",
  modalTitle,
  modalDescription,
  disabled = false
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <>
      <button type="submit" className={className} disabled={isDisabled} aria-busy={pending}>
        {pending ? pendingLabel : idleLabel}
      </button>
      {pending ? (
        <div className="admin-processing-overlay" role="status" aria-live="polite">
          <div className="admin-processing-overlay__card">
            <p className="eyebrow">Please wait</p>
            <h3>{modalTitle}</h3>
            <p>{modalDescription}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
