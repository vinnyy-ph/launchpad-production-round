"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Badge,
  BadgeDot,
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
  SearchInput,
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

const PAGE_SIZE = 10;
const STATUS_OPTIONS: { value: SurveyStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "draft", label: STATUS_LABEL.draft },
  { value: "active", label: STATUS_LABEL.active },
  { value: "closed", label: STATUS_LABEL.closed },
];

// ─── Cell pieces ──────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<SurveyStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "neutral",
  closed: "warning",
};

function StatusChip({ status }: { status: SurveyStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} pill>
      <BadgeDot />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function AnonymityChip({ anonymous }: { anonymous: boolean }) {
  return anonymous ? (
    <Badge variant="brand" pill>
      Anonymous
    </Badge>
  ) : (
    <Badge variant="modern" pill>
      Identified
    </Badge>
  );
}

/** Audience · Recurrence · N rounds (rounds shown only for recurring surveys). */
function audienceSummary(s: SurveyListItem): string {
  const parts = [AUDIENCE_TYPE_LABEL[s.audienceType], RECURRING_TYPE_LABEL[s.recurringType]];
  if (s.recurringType !== "ONE_TIME" && s.occurrenceCount > 0) {
    parts.push(`${s.occurrenceCount} round${s.occurrenceCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function ResponsesCell({ s }: { s: SurveyListItem }) {
  const status = deriveStatus(s);
  if (status === "draft") {
    return <span className="text-sm text-[color:var(--text-quaternary)]">Not sent yet</span>;
  }
  return (
    <span className="whitespace-nowrap text-sm text-[color:var(--text-primary)]">
      <b className="font-semibold">{s.respondedCount}</b>{" "}
      <span className="text-[color:var(--text-tertiary)]">of {s.recipientCount}</span>
    </span>
  );
}

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
    return [...filtered].sort((a, b) => dir * a.name.localeCompare(b.name));
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

  // Row click lands on the thing that exists for that survey: results for any survey
  // that's been sent (active/closed), the editor for an unsent draft.
  const openRow = (s: SurveyListItem) => {
    if (deriveStatus(s) === "draft") openEdit(s);
    else router.push(`/hr/surveys/${s.id}/results`);
  };

  // Activation is a separate endpoint that snapshots the audience and sets the survey live.
  // "Create & activate" chains it onto the save so the builder can offer one primary action.
  const activateAndClose = (id: string) =>
    activateSurvey.mutate(id, {
      onSuccess: () => {
        toast.success("Survey activated");
        closeBuilder();
      },
      onError: (e) => toast.error(e.message),
    });

  const handleSave = (input: CreateSurveyInput, opts?: { activate?: boolean }) => {
    const activate = !!opts?.activate;
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
          onSuccess: (updated) => {
            if (activate && !isLocked) {
              activateAndClose(updated.id);
            } else {
              toast.success("Survey updated.");
              closeBuilder();
            }
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      createSurvey.mutate(input, {
        onSuccess: (created) => {
          if (activate) {
            activateAndClose(created.id);
          } else {
            toast.success("Survey saved as a draft.");
            closeBuilder();
          }
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  // Silent autosave persist: create the draft on first valid save (capturing its id so the
  // builder switches to incremental updates), update it thereafter. No toast, no close.
  const handleAutosave = async (
    input: CreateSurveyInput,
    id: string | null,
  ): Promise<string> => {
    if (id) {
      await updateSurvey.mutateAsync({ id, input });
      return id;
    }
    const created = await createSurvey.mutateAsync(input);
    setEditingId(created.id);
    return created.id;
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteSurvey.mutate(deletingId, {
      onSuccess: () => toast.success("Draft deleted"),
      onError: (e) => toast.error(e.message),
      onSettled: () => setDeletingId(null),
    });
  };

  const handleActivate = () => {
    if (!activatingId) return;
    activateSurvey.mutate(activatingId, {
      onSuccess: () => toast.success("Survey activated"),
      onError: (e) => toast.error(e.message),
      onSettled: () => setActivatingId(null),
    });
  };

  const handleDeactivate = () => {
    if (!deactivatingId) return;
    deactivateSurvey.mutate(deactivatingId, {
      onSuccess: () => toast.success("Survey deactivated"),
      onError: (e) => toast.error(e.message),
      onSettled: () => setDeactivatingId(null),
    });
  };

  const saving =
    createSurvey.isPending || updateSurvey.isPending || activateSurvey.isPending;

  const columns: Column<SurveyListItem>[] = [
    {
      header: "Name",
      sortable: true,
      sortKey: "name",
      className: "min-w-[240px]",
      cell: (s) => (
        <div className="min-w-0 py-1">
          <p className="truncate text-[16px] font-semibold text-[color:var(--text-primary)]">
            {s.name}
          </p>
          <p className="truncate text-[12px] text-[color:var(--text-tertiary)]">
            {audienceSummary(s)}
          </p>
        </div>
      ),
    },
    {
      header: "Type",
      mobileLabel: "Type",
      className: "min-w-[130px] text-center whitespace-nowrap",
      cell: (s) => <AnonymityChip anonymous={s.isAnonymous} />,
    },
    {
      header: "Responses",
      mobileLabel: "Responses",
      className: "min-w-[150px] text-center whitespace-nowrap",
      cell: (s) => <ResponsesCell s={s} />,
    },
    {
      header: "Status",
      mobileLabel: "Status",
      className: "min-w-[120px] text-center whitespace-nowrap",
      cell: (s) => <StatusChip status={deriveStatus(s)} />,
    },
    {
      header: "Actions",
      mobileFooter: true,
      className: "min-w-[190px] text-right whitespace-nowrap",
      cell: (s) => {
        const status = deriveStatus(s);
        return (
          <div className="inline-flex items-center justify-end gap-1.5">
            {/* Lifecycle toggle — labeled so "live vs stopped" reads at a glance, instead of an
                ambiguous play/pause glyph. Closed is terminal (a survey with occurrences can't
                be reactivated), so it gets no toggle. */}
            {status === "draft" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivatingId(s.id);
                }}
              >
                <Power className="h-3.5 w-3.5" />
                Activate
              </Button>
            )}
            {status === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeactivatingId(s.id);
                }}
              >
                <PowerOff className="h-3.5 w-3.5" />
                Deactivate
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
              aria-label={status === "draft" ? "Continue editing" : "Edit survey"}
              title={status === "draft" ? "Continue editing" : "Edit survey"}
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
                aria-label="Delete draft"
                title="Delete draft"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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
        subtitle="Check in with employees and see how they're doing."
      />

      <FilterBar aria-label="Filter surveys" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name…"
            aria-label="Search surveys"
            containerClassName="min-w-0 sm:max-w-[360px] sm:flex-1"
          />
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
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          isLoading={surveysQuery.isLoading}
          error={surveysQuery.isError ? (surveysQuery.error?.message ?? "Could not load surveys.") : null}
          onRetry={() => void surveysQuery.refetch()}
          getRowId={(s) => s.id}
          onRowClick={openRow}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, totalPages, onPageChange: setPage }}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title={hasFilters ? "No surveys match that." : "No surveys yet"}
              body={
                hasFilters
                  ? "Try a different name or status filter."
                  : "Create your first pulse survey to start gathering insights."
              }
              action={hasFilters ? undefined : { label: "Create survey", onClick: openCreate }}
            />
          }
        />
      </div>

      {/* Builder dialog */}
      <SurveyBuilderDialog
        open={builderOpen}
        onClose={closeBuilder}
        initial={editingId ? detailQuery.data : null}
        loading={!!editingId && detailQuery.isLoading}
        saving={saving}
        onSave={handleSave}
        draftId={editingId}
        onAutosave={handleAutosave}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft hasn&apos;t been sent, so nothing is lost for employees. This can&apos;t be
              undone.
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
              This immediately closes the current round — even if its deadline hasn&apos;t passed —
              and stops all future rounds. Responses already collected are kept and stay viewable in
              the results. This can&apos;t be undone: a deactivated survey can&apos;t be reactivated.
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
