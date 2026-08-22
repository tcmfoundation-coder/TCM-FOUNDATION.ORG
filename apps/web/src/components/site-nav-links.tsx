"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "./ui/external-link";
import type { NavItem } from "./mobile-nav";

// Split out from SiteHeader (a server component fetching SiteSettings) so
// only this small piece needs usePathname() for active-link styling —
// mirrors how MobileNav is already a separate client component fed
// navItems as a prop.
export function SiteNavLinks({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
      {navItems.map((item) => {
        if (item.external) {
          return (
            <ExternalLink
              key={item.href}
              href={item.href}
              showIcon={false}
              className="text-sm text-stone-700 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              {item.label}
            </ExternalLink>
          );
        }

        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
              isActive ? "font-medium text-brand-700" : "text-stone-700 hover:text-brand-700"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
