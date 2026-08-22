"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Same visual language as ui/pagination.tsx, but click-driven rather than
// href-driven — for lists that paginate in-memory over an already-fetched
// batch instead of a URL-addressable page.
export function ClientPagination({ currentPage, totalPages, onPageChange }: ClientPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <PageButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </PageButton>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`flex size-9 items-center justify-center rounded-sm text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700 ${
            page === currentPage ? "bg-brand-600 text-white" : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          {page}
        </button>
      ))}

      <PageButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </PageButton>
    </nav>
  );
}

function PageButton({
  onClick,
  disabled,
  children,
  ...props
}: {
  onClick: () => void;
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
    <button
      type="button"
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-sm text-stone-700 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
      {...props}
    >
      {children}
    </button>
  );
}
