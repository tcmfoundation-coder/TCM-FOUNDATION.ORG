import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Given a page number, return the URL for that page (e.g. `?page=2`). */
  hrefForPage: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <PaginationLink href={hrefForPage(currentPage - 1)} disabled={prevDisabled} aria-label="Previous page">
        <ChevronLeft aria-hidden="true" className="size-4" />
      </PaginationLink>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={hrefForPage(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`flex size-9 items-center justify-center rounded-sm text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700 ${
            page === currentPage ? "bg-brand-600 text-white" : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          {page}
        </Link>
      ))}

      <PaginationLink href={hrefForPage(currentPage + 1)} disabled={nextDisabled} aria-label="Next page">
        <ChevronRight aria-hidden="true" className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
  ...props
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
  "aria-label": string;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="flex size-9 items-center justify-center rounded-sm text-stone-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex size-9 items-center justify-center rounded-sm text-stone-700 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
      {...props}
    >
      {children}
    </Link>
  );
}
