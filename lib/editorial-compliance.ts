export function canPublishPost(input: {
  aiGenerated: boolean;
  publishing: boolean;
  editorialReviewed: boolean;
  reviewerName: string | null | undefined;
  reviewedAt: Date | null | undefined;
}) {
  if (!input.publishing || !input.aiGenerated) {
    return true;
  }

  return Boolean(
    input.editorialReviewed &&
      input.reviewerName?.trim() &&
      input.reviewedAt &&
      !Number.isNaN(input.reviewedAt.getTime())
  );
}
