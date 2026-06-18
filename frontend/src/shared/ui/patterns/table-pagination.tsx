import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/primitives/button";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

/**
 * Footer pagination for list tables: Previous on the left, page numbers centered,
 * Next on the right — matches the Directory table layout.
 */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
  className,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex items-center justify-between gap-3 border-t border-[color:var(--border-primary)] px-4 py-3",
        className,
      )}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Go to previous page"
      >
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>

      <div className="flex items-center justify-center gap-1">
        {pages.map((pageNumber, index) => {
          const prev = pages[index - 1];
          const showEllipsis = prev != null && pageNumber - prev > 1;

          return (
            <span key={pageNumber} className="flex items-center gap-1">
              {showEllipsis ? (
                <span className="px-1 text-sm text-[color:var(--text-tertiary)]" aria-hidden="true">
                  …
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={pageNumber === page ? "page" : undefined}
                className={cn(
                  "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
                  pageNumber === page
                    ? "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)]"
                    : "text-[color:var(--text-secondary)] hover:bg-gray-50",
                )}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Go to next page"
      >
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
