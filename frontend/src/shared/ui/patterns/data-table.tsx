import { useState, useEffect, type ReactNode, type KeyboardEvent } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
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
}

/**
 * True below the `md` breakpoint. Defaults to false (desktop) on the server and
 * wherever `matchMedia` is unavailable (jsdom), so SSR and unit tests render the
 * table — only the browser swaps to the card layout.
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

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyState,
  onRowClick,
  getRowId,
}: DataTableProps<T>) {
  const compact = useIsCompact();

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  const clickable = !!onRowClick;
  const onKey = (row: T) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick!(row);
    }
  };
  const empty = !data || data.length === 0;

  // Mobile (< md): cards — a table that clips on a phone is a broken table.
  if (compact) {
    if (isLoading) {
      return (
        <ul className="divide-y divide-[color:var(--border-primary)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-2 p-4">
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
    );
  }

  // Desktop (≥ md): table
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, i) => (
            <TableHead key={i} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, r) => (
            <TableRow key={r}>
              {columns.map((_, c) => (
                <TableCell key={c}>
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
          data!.map((row, i) => (
            <TableRow
              key={getRowId ? getRowId(row) : i}
              onClick={clickable ? () => onRowClick!(row) : undefined}
              onKeyDown={clickable ? onKey(row) : undefined}
              tabIndex={clickable ? 0 : undefined}
              role={clickable ? "button" : undefined}
              className={cn(
                clickable &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
            >
              {columns.map((col, c) => (
                <TableCell key={c} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
