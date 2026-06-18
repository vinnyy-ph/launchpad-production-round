"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button, Badge } from "@/shared/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui";
import { EmptyState, DataTable, type Column } from "@/shared/ui/patterns";
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

export default function HRSurveysPage() {
  const surveysQuery = useSurveys();
  const surveys = surveysQuery.data ?? [];

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const detailQuery = useSurvey(editingId);
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();
  const activateSurvey = useActivateSurvey();
  const deactivateSurvey = useDeactivateSurvey();

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
      cell: (s) => (
        <Badge variant={s.isAnonymous ? "success" : "neutral"}>
          {s.isAnonymous ? "Anonymous" : "Named"}
        </Badge>
      ),
    },
    {
      header: "Occurrences",
      cell: (s) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{s.occurrenceCount}</span>
      ),
    },
    {
      header: "Status",
      cell: (s) => {
        const status = deriveStatus(s);
        return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
      },
    },
    {
      header: "",
      cell: (s) => {
        const status = deriveStatus(s);
        return (
          <div className="flex items-center justify-end gap-1">
            {status === "active" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeactivatingId(s.id);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Deactivate survey"
              >
                <Square size={12} /> Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivatingId(s.id);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Activate survey"
              >
                <Play size={12} /> Activate
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(s);
              }}
              className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="Edit survey"
            >
              <Pencil size={14} />
            </button>
            {status === "draft" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(s.id);
                }}
                className="rounded-lg p-1.5 text-[color:var(--color-error-500)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Delete survey"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="Pulse surveys"
        subtitle="Build and manage surveys across the organisation."
        action={
          <Button onClick={openCreate}>
            <Plus /> Create survey
          </Button>
        }
      />

      {/* Loading skeletons */}
      {surveysQuery.isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3"
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-48 rounded bg-[color:var(--bg-tertiary)]" />
                <div className="h-2.5 w-32 rounded bg-[color:var(--bg-tertiary)]" />
              </div>
              <div className="h-5 w-16 rounded-full bg-[color:var(--bg-tertiary)]" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {surveysQuery.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            {surveysQuery.error.message}
          </span>
          <button
            onClick={() => void surveysQuery.refetch()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!surveysQuery.isLoading && !surveysQuery.isError && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <DataTable
            columns={columns}
            data={surveys}
            getRowId={(s) => s.id}
            onRowClick={(s) => openEdit(s)}
            emptyState={
              <EmptyState
                icon={ClipboardList}
                title="No surveys yet"
                body="Create your first pulse survey to start gathering insights."
                action={{ label: "Create survey", onClick: openCreate }}
              />
            }
          />
        </div>
      )}

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
