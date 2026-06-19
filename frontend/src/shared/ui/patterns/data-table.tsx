import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { ErrorState } from "./error-boundary";
import { cn } from "@/shared/lib/utils";

export interface Column<T> {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Plain label for compact card rows (avoids sort controls in the label slot). */
  mobileLabel?: ReactNode;
  /** Render below the detail list, full width — e.g. row actions. */
  mobileFooter?: boolean;
  sortable?: boolean;
  sortKey?: string;
}

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  key: string;
  direction: SortDirection;
}

interface DataTablePagination {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyState: ReactNode;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  pagination?: DataTablePagination;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /**
   * Small-screen behavior. "cards" (default) stacks each row into a card; "scroll" keeps the
   * tabular layout and lets it scroll horizontally inside its container.
   */
  mobileLayout?: "cards" | "scroll";
}

/**
 * True below the `md` breakpoint. Defaults to false (desktop) on the server and
 * wherever `matchMedia` is unavailable (jsdom), so SSR and unit tests render the
 * table; only the browser swaps to the card layout.
 */
function useIsCompact() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return compact;
}

function pageRange(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function PaginationFooter({ page, totalPages, onPageChange }: DataTablePagination) {
  if (totalPages <= 1) return null;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-[color:var(--border-primary)] px-4 py-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        className="justify-self-start"
        onClick={() => onPageChange(page - 1)}
      >
        <ArrowLeft /> Previous
      </Button>

      <div className="flex items-center gap-2">
        {pageRange(page, totalPages).map((pageNumber) => (
          <Button
            key={pageNumber}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-current={pageNumber === page ? "page" : undefined}
            className={cn(
              "border-transparent",
              pageNumber === page && "bg-[color:var(--bg-secondary)] font-semibold",
            )}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        className="justify-self-end"
        onClick={() => onPageChange(page + 1)}
      >
        Next <ArrowRight />
      </Button>
    </div>
  );
}

function nextSortDirection(current: DataTableSort | undefined, key: string): SortDirection {
  if (current?.key !== key) return "asc";
  return current.direction === "asc" ? "desc" : "asc";
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: SortDirection;
}) {
  return (
    <span aria-hidden="true" className="inline-flex flex-col items-center gap-[2px]">
      <span
        className={cn(
          "h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent",
          active && direction === "asc"
            ? "border-b-[color:var(--text-primary)]"
            : "border-b-[color:var(--gray-neutral-300)]",
        )}
      />
      <span
        className={cn(
          "h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent",
          active && direction === "desc"
            ? "border-t-[color:var(--text-primary)]"
            : "border-t-[color:var(--gray-neutral-300)]",
        )}
      />
    </span>
  );
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyState,
  onRowClick,
  getRowId,
  pagination,
  sort,
  onSortChange,
  mobileLayout = "cards",
}: DataTableProps<T>) {
  // "scroll" mode keeps the table on small screens (it scrolls horizontally) instead of cards.
  const compact = useIsCompact() && mobileLayout === "cards";

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  const clickable = !!onRowClick;
  const onKey = (row: T) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick!(row);
    }
  };
  const empty = !data || data.length === 0;
  const handleSort = (key: string) => {
    if (!onSortChange) return;
    onSortChange({ key, direction: nextSortDirection(sort, key) });
  };

  if (compact) {
    if (isLoading) {
      return (
        <ul className="divide-y divide-[color:var(--border-primary)]">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="space-y-2 p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </li>
          ))}
        </ul>
      );
    }
    if (empty) return <>{emptyState}</>;
    const detailColumns = columns.slice(1).filter((col) => !col.mobileFooter);
    const footerColumns = columns.slice(1).filter((col) => col.mobileFooter);
    return (
      <>
        <ul className="divide-y divide-[color:var(--border-primary)]">
          {data!.map((row, i) => (
            <li
              key={getRowId ? getRowId(row) : i}
              onClick={clickable ? () => onRowClick!(row) : undefined}
              onKeyDown={clickable ? onKey(row) : undefined}
              tabIndex={clickable ? 0 : undefined}
              role={clickable ? "button" : undefined}
              className={cn(
                "p-4",
                clickable &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
            >
              {columns[0] && <div>{columns[0].cell(row)}</div>}
              {detailColumns.length > 0 && (
                <dl className="mt-3 space-y-1.5">
                  {detailColumns.map((col, c) => (
                    <div key={c} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 pt-0.5 text-xs font-medium text-[color:var(--text-tertiary)]">
                        {col.mobileLabel ?? col.header}
                      </dt>
                      <dd className="min-w-0 text-right text-sm text-[color:var(--text-secondary)]">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {footerColumns.map((col, c) => (
                <div
                  key={c}
                  className={cn(
                    "flex justify-end",
                    detailColumns.length > 0 || columns[0] ? "mt-3 border-t border-[color:var(--border-primary)] pt-3" : "",
                  )}
                >
                  {col.cell(row)}
                </div>
              ))}
            </li>
          ))}
        </ul>
        {pagination ? <PaginationFooter {...pagination} /> : null}
      </>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, index) => (
              <TableHead
                key={index}
                className={col.className}
                aria-sort={
                  col.sortable && col.sortKey && sort?.key === col.sortKey
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.sortable && col.sortKey ? (
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm text-[10.5px] font-bold uppercase tracking-[0.8px] text-[color:var(--text-tertiary)] outline-none transition-colors hover:text-[color:var(--text-primary)] focus-visible:ring-2 focus-visible:ring-ring",
                      col.className?.includes("text-center") && "justify-center",
                    )}
                    onClick={() => handleSort(col.sortKey!)}
                    aria-label={`Sort by ${String(col.header)} ${
                      sort?.key === col.sortKey && sort.direction === "asc"
                        ? "descending"
                        : "ascending"
                    }`}
                  >
                    <span>{col.header}</span>
                    <SortIcon
                      active={sort?.key === col.sortKey}
                      direction={sort?.direction}
                    />
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : empty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow
                key={getRowId ? getRowId(row) : rowIndex}
                onClick={clickable ? () => onRowClick!(row) : undefined}
                onKeyDown={clickable ? onKey(row) : undefined}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
                className={cn(
                  clickable &&
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                )}
              >
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && !isLoading && !empty ? <PaginationFooter {...pagination} /> : null}
    </>
  );
}
