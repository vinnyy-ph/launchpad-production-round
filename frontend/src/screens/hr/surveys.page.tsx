"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  BarChart3,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui";
import {
  EmptyState,
  DataTable,
  type Column,
  type DataTableSort,
  FilterBar,
  TablePagination,
} from "@/shared/ui/patterns";
import { SurveyBuilderDialog } from "@/modules/performance/surveys/components/survey-builder";
import { useSurveys } from "@/modules/performance/surveys/hooks/use-surveys";
import { useSurvey } from "@/modules/performance/surveys/hooks/use-survey";
import { useCreateSurvey } from "@/modules/performance/surveys/hooks/use-create-survey";
import { useUpdateSurvey } from "@/modules/performance/surveys/hooks/use-update-survey";
import { useDeleteSurvey } from "@/modules/performance/surveys/hooks/use-delete-survey";
import { useActivateSurvey } from "@/modules/performance/surveys/hooks/use-activate-survey";
import { useDeactivateSurvey } from "@/modules/performance/surveys/hooks/use-deactivate-survey";
import type {
  SurveyListItem,
  SurveyStatus,
  CreateSurveyInput,
} from "@/modules/performance/surveys/types/surveys.types";
import {
  AUDIENCE_TYPE_LABEL,
  RECURRING_TYPE_LABEL,
  STATUS_LABEL,
  deriveStatus,
} from "@/modules/performance/surveys/types/surveys.types";

const STATUS_VARIANT: Record<SurveyStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "neutral",
  closed: "warning",
};

const PAGE_SIZE = 10;
const STATUS_OPTIONS: { value: SurveyStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "active", label: STATUS_LABEL.active },
  { value: "draft", label: STATUS_LABEL.draft },
  { value: "closed", label: STATUS_LABEL.closed },
];
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "occurrences", label: "Occurrences" },
  { value: "status", label: "Status" },
];

export default function HRSurveysPage() {
  const router = useRouter();
  const surveysQuery = useSurveys();
  const surveys = useMemo(() => surveysQuery.data ?? [], [surveysQuery.data]);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | "ALL">("ALL");
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);

  const detailQuery = useSurvey(editingId);
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();
  const activateSurvey = useActivateSurvey();
  const deactivateSurvey = useDeactivateSurvey();

  // Search + status filter, then sort — all client-side over the survey list.
  const filtered = useMemo(() => {
    let list = surveys;
    if (statusFilter !== "ALL") list = list.filter((s) => deriveStatus(s) === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    return list;
  }, [surveys, statusFilter, search]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "occurrences":
          return dir * (a.occurrenceCount - b.occurrenceCount);
        case "status":
          return dir * deriveStatus(a).localeCompare(deriveStatus(b));
        case "name":
        default:
          return dir * a.name.localeCompare(b.name);
      }
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Boolean(search || statusFilter !== "ALL");

  // Reset to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const openCreate = () => {
    setEditingId(null);
    setBuilderOpen(true);
  };

  const openEdit = (s: SurveyListItem) => {
    setEditingId(s.id);
    setBuilderOpen(true);
  };

  const closeBuilder = () => {
    setBuilderOpen(false);
    setEditingId(null);
  };

  const handleSave = (input: CreateSurveyInput) => {
    if (editingId) {
      // Once a survey is activated the server locks every field except name + visibility.
      // Sending the locked fields back (even unchanged) trips the guard and 409s, so trim
      // the payload to just the editable fields for an activated survey.
      const isLocked = (detailQuery.data?.occurrenceCount ?? 0) > 0;
      const payload = isLocked
        ? { name: input.name, visibility: input.visibility }
        : input;
      updateSurvey.mutate(
        { id: editingId, input: payload },
        {
          onSuccess: () => {
            toast.success("Survey updated.");
            closeBuilder();
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      createSurvey.mutate(input, {
        onSuccess: () => {
          toast.success("Survey saved as a draft.");
          closeBuilder();
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteSurvey.mutate(deletingId, {
      onSuccess: () => toast.success("Survey deleted."),
      onError: (e) => toast.error(e.message),
      onSettled: () => setDeletingId(null),
    });
  };

  const handleActivate = () => {
    if (!activatingId) return;
    activateSurvey.mutate(activatingId, {
      onSuccess: () => toast.success("Survey activated — it is now live."),
      onError: (e) => toast.error(e.message),
      onSettled: () => setActivatingId(null),
    });
  };

  const handleDeactivate = () => {
    if (!deactivatingId) return;
    deactivateSurvey.mutate(deactivatingId, {
      onSuccess: () => toast.success("Survey deactivated."),
      onError: (e) => toast.error(e.message),
      onSettled: () => setDeactivatingId(null),
    });
  };

  const saving = createSurvey.isPending || updateSurvey.isPending;

  const columns: Column<SurveyListItem>[] = [
    {
      header: "Name",
      sortable: true,
      sortKey: "name",
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {s.name}
          </p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
            {AUDIENCE_TYPE_LABEL[s.audienceType]}
            {" · "}
            {RECURRING_TYPE_LABEL[s.recurringType]}
          </p>
        </div>
      ),
    },
    {
      header: "Anonymity",
      mobileLabel: "Anonymity",
      cell: (s) => (
        <Badge variant={s.isAnonymous ? "success" : "neutral"}>
          {s.isAnonymous ? "Anonymous" : "Named"}
        </Badge>
      ),
    },
    {
      header: "Occurrences",
      mobileLabel: "Occurrences",
      sortable: true,
      sortKey: "occurrences",
      cell: (s) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{s.occurrenceCount}</span>
      ),
    },
    {
      header: "Status",
      mobileLabel: "Status",
      sortable: true,
      sortKey: "status",
      cell: (s) => {
        const status = deriveStatus(s);
        return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
      },
    },
    {
      header: "",
      mobileFooter: true,
      className: "w-[1%] whitespace-nowrap text-right",
      cell: (s) => {
        const status = deriveStatus(s);
        return (
          <div className="flex w-full justify-end">
            <div className="inline-flex items-center gap-1">
              {status !== "draft" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[color:var(--text-tertiary)] hover:bg-gray-50 hover:text-[color:var(--text-secondary)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/hr/surveys/${s.id}/results`);
                  }}
                  aria-label="View results"
                  title="View results"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              )}
              {status === "active" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[color:var(--text-tertiary)] hover:bg-gray-50 hover:text-[color:var(--text-secondary)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeactivatingId(s.id);
                  }}
                  aria-label="Deactivate survey"
                  title="Deactivate survey"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[color:hsl(var(--primary))] hover:bg-gray-50 hover:text-[color:hsl(var(--primary))]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivatingId(s.id);
                  }}
                  aria-label="Activate survey"
                  title="Activate survey"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[color:var(--text-tertiary)] hover:bg-gray-50 hover:text-[color:var(--text-secondary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(s);
                }}
                aria-label="Edit survey"
                title="Edit survey"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {status === "draft" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#D92D20] hover:bg-[#FEF3F2] hover:text-[#D92D20]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(s.id);
                  }}
                  aria-label="Delete survey"
                  title="Delete survey"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        level="page"
        title="Pulse surveys"
        subtitle="Build and manage surveys across the organisation."
      />

      <FilterBar aria-label="Filter surveys" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search surveys"
            className="w-full sm:max-w-[320px]"
          />
          <div className="flex w-full gap-2 md:hidden">
            <Select
              value={sort.key}
              onValueChange={(v: string) => setSort((cur) => ({ key: v, direction: cur.direction }))}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() =>
                setSort((cur) => ({
                  key: cur.key,
                  direction: cur.direction === "asc" ? "desc" : "asc",
                }))
              }
              aria-label={`Sort ${sort.direction === "asc" ? "descending" : "ascending"}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v: string) => setStatusFilter(v as SurveyStatus | "ALL")}
          >
            <SelectTrigger className="relative w-full pl-9 sm:w-[180px]" aria-label="Filter by status">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
                aria-hidden="true"
              />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="w-full shrink-0 sm:ml-auto sm:w-auto">
          <Plus aria-hidden="true" />
          Create survey
        </Button>
      </FilterBar>

      <div
        className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          isLoading={surveysQuery.isLoading}
          error={surveysQuery.isError ? (surveysQuery.error?.message ?? "Could not load surveys.") : null}
          onRetry={() => void surveysQuery.refetch()}
          getRowId={(s) => s.id}
          onRowClick={(s) => openEdit(s)}
          sort={sort}
          onSortChange={setSort}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title={hasFilters ? "No matching surveys" : "No surveys yet"}
              body={
                hasFilters
                  ? "Try a different search or status filter."
                  : "Create your first pulse survey to start gathering insights."
              }
              action={hasFilters ? undefined : { label: "Create survey", onClick: openCreate }}
            />
          }
        />
        {totalPages > 1 && (
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Builder dialog */}
      <SurveyBuilderDialog
        open={builderOpen}
        onClose={closeBuilder}
        initial={editingId ? detailQuery.data : null}
        loading={!!editingId && detailQuery.isLoading}
        saving={saving}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Only draft surveys can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteSurvey.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate confirm */}
      <AlertDialog open={!!activatingId} onOpenChange={(o) => !o && setActivatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate survey?</AlertDialogTitle>
            <AlertDialogDescription>
              Once active, the survey is sent to its audience and its questions and audience are
              locked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={activateSurvey.isPending}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivatingId} onOpenChange={(o) => !o && setDeactivatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              The survey will stop accepting responses until it is reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deactivateSurvey.isPending}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
