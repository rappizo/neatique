import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className
}: ButtonLinkProps) {
  return <Link href={href} className={cn("button", `button--${variant}`, className)}>{children}</Link>;
}
