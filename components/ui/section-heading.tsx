import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}: SectionHeadingProps) {
  return (
    <div className={cn("section-heading", align === "center" && "section-heading--center")}>
      {eyebrow ? <p className="section-heading__eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="section-heading__description">{description}</p> : null}
    </div>
  );
}
