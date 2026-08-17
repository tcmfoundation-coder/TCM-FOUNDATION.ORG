"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  showIcon?: boolean;
}

// Every outbound link (TCM TV, social profiles, partner sites, external
// opportunities) goes through this component — enforces target/rel, a
// visible + screen-reader-announced signal that it leaves the site, and a
// generic "external_link_click" GA4 event (design brief's analytics list:
// TCM Hub clicks, external opportunity clicks, Learning Hub clicked, etc.
// are all outbound links, so one tracked component covers all of them).
export function ExternalLink({ href, children, showIcon = true, className, onClick, ...props }: ExternalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackEvent("external_link_click", { url: href });
    onClick?.(event);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      {...props}
    >
      {children}
      {showIcon && <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
