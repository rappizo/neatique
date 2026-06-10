import {
  AI_GENERATED_PERSON_LABEL,
  isAiGeneratedPersonImage
} from "@/lib/ai-image-disclosure";

type AiGeneratedPersonBadgeProps = {
  src?: string | null;
};

export function AiGeneratedPersonBadge({ src }: AiGeneratedPersonBadgeProps) {
  if (!isAiGeneratedPersonImage(src)) {
    return null;
  }

  return (
    <span className="ai-person-badge" aria-label={AI_GENERATED_PERSON_LABEL}>
      {AI_GENERATED_PERSON_LABEL}
    </span>
  );
}
