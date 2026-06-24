import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/primitives/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/primitives/tooltip";
import {
  DataTable,
  EmptyState,
  FilterBar,
  SearchInput,
  useConfirm,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { ApiError } from "@/shared/lib/api-client";
import { useDepartmentsList } from "@/modules/people/departments/hooks/use-departments-list";
import { useDepartmentMutations } from "@/modules/people/departments/hooks/use-department-mutations";
import { DepartmentFormDialog } from "@/modules/people/departments/components/department-form-dialog";
import type {
  DepartmentListItem,
  DepartmentSortBy,
  SortDirection,
} from "@/modules/people/departments/types/departments.types";

const PAGE_SIZE = 10;

/**
 * Departments management for the HR Configurations page: a searchable, paginated table
 * with create/rename/delete. Renders as a section panel (no page-level chrome) so it can
 * sit under the Configurations › Departments tab.
 */
export function DepartmentsPanel() {
  const confirm = useConfirm();
  const { remove } = useDepartmentMutations();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentListItem | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { departments, meta, loading, error, reload } = useDepartmentsList({
    search: debouncedSearch || undefined,
    sortBy: sort.key as DepartmentSortBy,
    sortDirection: sort.direction as SortDirection,
    page,
    limit: PAGE_SIZE,
  });

  const hasFilters = Boolean(search);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(department: DepartmentListItem) {
    setEditing(department);
    setFormOpen(true);
  }

  async function handleDelete(department: DepartmentListItem) {
    await confirm({
      title: "Delete department",
      description: `Delete "${department.name}"? It will be removed from the list. You can recreate it later.`,
      confirmLabel: "Delete",
      confirmLoadingLabel: "Deleting…",
      cancelLabel: "Cancel",
      destructive: true,
      onConfirm: async () => {
        try {
          await remove(department.id);
          toast.success(`Department "${department.name}" deleted.`);
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Could not delete the department.";
          toast.error(message);
          throw err; // keep the confirm dialog open so the user can cancel
        }
      },
    });
  }

  const columns: Column<DepartmentListItem>[] = [
    {
      header: "Department name",
      className: "min-w-[220px]",
      sortable: true,
      sortKey: "name",
      cell: (department) => (
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {department.name}
        </p>
      ),
    },
    {
      header: "Employees",
      className: "min-w-[140px] text-center",
      sortable: true,
      sortKey: "employeeCount",
      cell: (department) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {department.employeeCount}
        </span>
      ),
    },
    {
      header: "Created",
      className: "min-w-[150px] text-center",
      sortable: true,
      sortKey: "createdAt",
      cell: (department) => (
        <span
          className="text-sm text-[color:var(--text-secondary)]"
          title={format(new Date(department.createdAt), "MMM d, yyyy")}
        >
          {formatDistanceToNow(new Date(department.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "w-[120px] text-right",
      mobileFooter: true,
      cell: (department) => {
        const hasEmployees = department.employeeCount > 0;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Rename ${department.name}`}
              onClick={() => openEdit(department)}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrap the disabled button so the tooltip still fires on hover. */}
                  <span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${department.name}`}
                      disabled={hasEmployees}
                      onClick={() => void handleDelete(department)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {hasEmployees ? (
                  <TooltipContent side="left">
                    Reassign its employees before deleting.
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        level="default"
        title="Departments"
        subtitle="The departments employees can be assigned to."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" /> Add department
          </Button>
        }
      />

      <FilterBar aria-label="Filter departments">
        <SearchInput
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name…"
          aria-label="Search departments"
          containerClassName="sm:max-w-[320px]"
        />
      </FilterBar>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={departments}
          isLoading={loading}
          error={error}
          onRetry={() => void reload()}
          getRowId={(department) => department.id}
          mobileLayout="scroll"
          sort={sort}
          onSortChange={(nextSort) => {
            setSort(nextSort);
            setPage(1);
          }}
          pagination={
            meta
              ? {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  onPageChange: setPage,
                }
              : undefined
          }
          emptyState={
            <EmptyState
              icon={Building2}
              title={hasFilters ? "No departments match" : "No departments yet"}
              body={
                hasFilters
                  ? "Try a different search."
                  : "Add your first department to start assigning employees."
              }
              action={
                hasFilters ? undefined : { label: "Add department", onClick: openCreate }
              }
            />
          }
        />
      </div>

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        department={editing}
        onSaved={() => void reload()}
      />
    </div>
  );
}
