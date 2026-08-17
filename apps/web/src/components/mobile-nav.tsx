"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonStyles } from "./ui/button";

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export function MobileNav({ navItems, donateHref }: { navItems: NavItem[]; donateHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-10 items-center justify-center rounded-sm text-stone-700 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
      >
        {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
      </button>

      {open && (
        <div id="mobile-nav-panel" className="absolute inset-x-0 top-full border-b border-stone-200 bg-white shadow-md">
          <nav aria-label="Primary" className="flex flex-col px-6 py-4">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-stone-100 py-3 text-sm font-medium text-stone-700"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-stone-100 py-3 text-sm font-medium text-stone-700"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              href={donateHref}
              className={buttonStyles({ variant: "primary", className: "mt-4 justify-center" })}
              onClick={() => setOpen(false)}
            >
              Donate
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
