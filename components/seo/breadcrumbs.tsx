import Link from "next/link";
import { buildBreadcrumbSchema, type BreadcrumbItem } from "@/lib/breadcrumbs";

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema(items)) }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          {items.map((item, index) => {
            const isCurrent = index === items.length - 1;

            return (
              <li key={item.href} aria-current={isCurrent ? "page" : undefined}>
                {isCurrent ? <span>{item.name}</span> : <Link href={item.href}>{item.name}</Link>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
