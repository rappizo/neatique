"use client";

import { useEffect, useState } from "react";

type CopyTextButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyTextButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className
}: CopyTextButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (status !== "copied") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "copied" ? copiedLabel : status === "error" ? "Copy failed" : label;

  return (
    <button
      type="button"
      className={className || "button button--secondary"}
      onClick={handleClick}
    >
      {buttonLabel}
    </button>
  );
}
