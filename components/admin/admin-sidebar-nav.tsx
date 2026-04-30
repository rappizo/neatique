"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

type AdminNavChild = {
  href: string;
  label: string;
};

type AdminNavItem = {
  href: string;
  label: string;
  children?: AdminNavChild[];
};

function isHrefActive(pathname: string, currentSearch: string, href: string) {
  const [cleanHref, targetSearch = ""] = href.split("?");

  if (targetSearch) {
    return pathname === cleanHref && currentSearch === targetSearch;
  }

  if (cleanHref === "/admin") {
    return pathname === "/admin";
  }

  if (pathname === cleanHref && currentSearch.includes("view=") && href === cleanHref) {
    return false;
  }

  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function isGroupActive(pathname: string, currentSearch: string, item: AdminNavItem) {
  return (
    isHrefActive(pathname, currentSearch, item.href) ||
    Boolean(item.children?.some((child) => isHrefActive(pathname, currentSearch, child.href)))
  );
}

export function AdminSidebarNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <nav className="admin-sidebar__nav" aria-label="Admin navigation">
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const groupActive = isGroupActive(pathname, currentSearch, item);
        const isOpen = openGroups[item.href] ?? groupActive;

        if (!hasChildren) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isHrefActive(pathname, currentSearch, item.href) ? "admin-sidebar__link is-active" : "admin-sidebar__link"}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <div key={item.href} className={isOpen ? "admin-sidebar__group is-open" : "admin-sidebar__group"}>
            <div className="admin-sidebar__group-row">
              <Link
                href={item.href}
                className={groupActive ? "admin-sidebar__link admin-sidebar__link--parent is-active" : "admin-sidebar__link admin-sidebar__link--parent"}
              >
                {item.label}
              </Link>
              <button
                type="button"
                className="admin-sidebar__toggle"
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label} menu`}
                onClick={() => setOpenGroups((current) => ({ ...current, [item.href]: !isOpen }))}
              >
                <span aria-hidden="true">v</span>
              </button>
            </div>

            {isOpen ? (
              <div className="admin-sidebar__children">
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={isHrefActive(pathname, currentSearch, child.href) ? "admin-sidebar__child is-active" : "admin-sidebar__child"}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
