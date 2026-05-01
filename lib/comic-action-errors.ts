export function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = error instanceof Error ? error.message : "";
  const digest =
    "digest" in error && typeof error.digest === "string" ? error.digest : "";

  return message === "NEXT_REDIRECT" || digest.startsWith("NEXT_REDIRECT");
}

export function isNextRedirectErrorMessage(errorMessage?: string | null) {
  if (!errorMessage) {
    return false;
  }

  return errorMessage === "NEXT_REDIRECT" || errorMessage.startsWith("NEXT_REDIRECT;");
}

export function getDisplayableComicErrorMessage(errorMessage?: string | null) {
  return isNextRedirectErrorMessage(errorMessage) ? null : errorMessage ?? null;
}
