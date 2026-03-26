import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link href={href} className={cn("brand-logo", className)}>
      <span className="brand-logo__mark" aria-hidden="true">
        N
      </span>
      <span className="brand-logo__text">
        <strong>Neatique</strong>
        <span>Professional Skincare</span>
      </span>
    </Link>
  );
}
