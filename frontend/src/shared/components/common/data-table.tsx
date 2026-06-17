import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "./error-boundary";
import { cn } from "@/shared/lib/utils";

export interface Column<T> {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
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
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

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
        ) : !data || data.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columns.length} className="p-0">
              {emptyState}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, i) => {
            const clickable = !!onRowClick;
            return (
              <TableRow
                key={getRowId ? getRowId(row) : i}
                onClick={clickable ? () => onRowClick!(row) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick!(row);
                        }
                      }
                    : undefined
                }
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
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
