"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Checkbox,
  DatePicker,
  Combobox,
  type ComboboxOption,
} from "@/shared/ui";
import { EmptyState, DataTable, FormField, type Column } from "@/shared/ui/patterns";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type {
  Survey,
  SurveyQuestion,
  QuestionType,
  Recurrence,
  SurveyStatus,
  AudienceType,
  VisibilityScope,
  ReminderType,
  Team,
  DemoEmployee,
} from "@/shared/mock/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

const STATUS_VARIANT: Record<SurveyStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  DRAFT: "neutral",
  CLOSED: "warning",
};

const STATUS_LABEL: Record<SurveyStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  CLOSED: "Closed",
};

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  NONE: "None",
  WEEKLY: "Weekly",
  BI_WEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  BI_MONTHLY: "Bi-monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
};

const AUDIENCE_TYPE_LABEL: Record<AudienceType, string> = {
  EVERYONE: "Everyone",
  SUPERVISOR_BASED: "Supervisor-based",
  SPECIFIC_TEAMS: "Specific teams",
};

const VISIBILITY_LABEL: Record<VisibilityScope, string> = {
  ADMIN_ONLY: "Admin only",
  HR_ADMIN: "HR & admin",
  SUPERVISOR_BASED: "Supervisor-based",
  TEAM_LEADS: "Team leads",
  EVERYONE: "Everyone",
};

const REMINDER_LABEL: Record<ReminderType, string> = {
  NONE: "None",
  DAILY: "Daily",
  EVERY_X_DAYS: "Every X days",
  WEEKLY: "Weekly",
};

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  RATING: "Rating (scale)",
  SINGLE: "Single choice",
  MULTI: "Multi-select",
  TEXT: "Open text",
};

// ─── Default builder state ───────────────────────────────────────────────────

interface BuilderState {
  title: string;
  description: string;
  audienceType: AudienceType;
  audienceTeamIds: string[];
  audienceSupervisorId: string;
  anonymous: boolean;
  minGroupSize: number;
  recurrence: Recurrence;
  status: SurveyStatus;
  releaseDate: Date | undefined;
  deadline: Date | undefined;
  reminderType: ReminderType;
  reminderIntervalDays: number;
  visibilityScope: VisibilityScope;
  questions: SurveyQuestion[];
}

function defaultBuilder(): BuilderState {
  return {
    title: "",
    description: "",
    audienceType: "EVERYONE",
    audienceTeamIds: [],
    audienceSupervisorId: "",
    anonymous: false,
    minGroupSize: 3,
    recurrence: "NONE",
    status: "DRAFT",
    releaseDate: new Date(),
    deadline: undefined,
    reminderType: "NONE",
    reminderIntervalDays: 7,
    visibilityScope: "SUPERVISOR_BASED",
    questions: [],
  };
}

function defaultQuestion(): SurveyQuestion {
  return {
    id: uid(),
    type: "RATING",
    prompt: "",
    options: [],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    multiline: false,
    maxChars: undefined,
    required: false,
  };
}

function audienceLabel(type: AudienceType): string {
  return AUDIENCE_TYPE_LABEL[type];
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useSurveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const data = readCollection<Survey>("surveys");
      setSurveys([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      setError("Could not load surveys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback((survey: Survey) => {
    const all = readCollection<Survey>("surveys");
    const idx = all.findIndex((s) => s.id === survey.id);
    const next = idx >= 0 ? all.map((s, i) => (i === idx ? survey : s)) : [...all, survey];
    writeCollection("surveys", next);
    setSurveys([...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  const remove = useCallback((id: string) => {
    const next = readCollection<Survey>("surveys").filter((s) => s.id !== id);
    writeCollection("surveys", next);
    setSurveys([...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  const activate = useCallback((id: string) => {
    const all = readCollection<Survey>("surveys").map((s) =>
      s.id === id ? { ...s, status: "ACTIVE" as SurveyStatus } : s,
    );
    writeCollection("surveys", all);
    setSurveys([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  const deactivate = useCallback((id: string) => {
    const all = readCollection<Survey>("surveys").map((s) =>
      s.id === id ? { ...s, status: "CLOSED" as SurveyStatus } : s,
    );
    writeCollection("surveys", all);
    setSurveys([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  return { surveys, loading, error, reload: load, save, remove, activate, deactivate };
}

// ─── Audience preview ─────────────────────────────────────────────────────────

function useAudienceCount(
  audienceType: AudienceType,
  audienceTeamIds: string[],
  audienceSupervisorId: string,
): string {
  return useMemo(() => {
    try {
      const employees = readCollection<DemoEmployee>("employees");
      const active = employees.filter((e) => e.isActive);
      if (audienceType === "EVERYONE") {
        return `~${active.length} employees`;
      }
      if (audienceType === "SUPERVISOR_BASED") {
        if (!audienceSupervisorId) return "Select a supervisor";
        const count = active.filter(
          (e) =>
            e.employeeId === audienceSupervisorId ||
            e.supervisorId === audienceSupervisorId,
        ).length;
        return `~${count} employees`;
      }
      if (audienceType === "SPECIFIC_TEAMS") {
        if (audienceTeamIds.length === 0) return "Select at least one team";
        const count = active.filter(
          (e) => e.teamId !== null && audienceTeamIds.includes(e.teamId),
        ).length;
        return `~${count} employees`;
      }
      return "";
    } catch {
      return "";
    }
  }, [audienceType, audienceTeamIds, audienceSupervisorId]);
}

// ─── Survey builder dialog ────────────────────────────────────────────────────

interface BuilderDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: Survey | null;
  onSave: (survey: Survey) => void;
}

function SurveyBuilderDialog({ open, onClose, initial, onSave }: BuilderDialogProps) {
  const [form, setForm] = useState<BuilderState>(defaultBuilder());
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Supervisor and team options from mock data
  const supervisorOptions = useMemo<ComboboxOption[]>(() => {
    try {
      const employees = readCollection<DemoEmployee>("employees");
      return employees
        .filter((e) => e.isSupervisor && e.isActive)
        .map((e) => ({ value: e.employeeId, label: e.displayName }));
    } catch {
      return [];
    }
  }, []);

  const teams = useMemo<Team[]>(() => {
    try {
      return readCollection<Team>("teams");
    } catch {
      return [];
    }
  }, []);

  const audienceCount = useAudienceCount(
    form.audienceType,
    form.audienceTeamIds,
    form.audienceSupervisorId,
  );

  // Populate from initial when dialog opens
  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title,
          description: initial.description,
          audienceType: initial.audienceType ?? "EVERYONE",
          audienceTeamIds: initial.audienceTeamIds ?? [],
          audienceSupervisorId: initial.audienceSupervisorId ?? "",
          anonymous: initial.anonymous,
          minGroupSize: initial.minGroupSize,
          recurrence: initial.recurrence,
          status: initial.status,
          releaseDate: toDate(initial.releaseDate),
          deadline: toDate(initial.deadline),
          reminderType: initial.reminderType ?? "NONE",
          reminderIntervalDays: initial.reminderIntervalDays ?? 7,
          visibilityScope: initial.visibilityScope ?? "SUPERVISOR_BASED",
          questions: initial.questions.map((q) => ({ ...q, options: [...(q.options ?? [])] })),
        });
      } else {
        setForm(defaultBuilder());
      }
      setErrors({});
      setActiveTab("settings");
    }
  }, [open, initial]);

  const set = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Questions
  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, defaultQuestion()] }));

  const updateQuestion = (qid: string, patch: Partial<SurveyQuestion>) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    }));

  const removeQuestion = (qid: string) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== qid) }));

  const addOption = (qid: string) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) =>
        q.id === qid ? { ...q, options: [...(q.options ?? []), ""] } : q,
      ),
    }));

  const updateOption = (qid: string, idx: number, val: string) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) =>
        q.id === qid
          ? { ...q, options: (q.options ?? []).map((o, i) => (i === idx ? val : o)) }
          : q,
      ),
    }));

  const removeOption = (qid: string, idx: number) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) =>
        q.id === qid ? { ...q, options: (q.options ?? []).filter((_, i) => i !== idx) } : q,
      ),
    }));

  const moveQuestion = (qid: string, dir: -1 | 1) =>
    setForm((f) => {
      const qs = [...f.questions];
      const i = qs.findIndex((q) => q.id === qid);
      const j = i + dir;
      if (j < 0 || j >= qs.length) return f;
      [qs[i], qs[j]] = [qs[j], qs[i]];
      return { ...f, questions: qs };
    });

  const toggleTeam = (teamId: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      audienceTeamIds: checked
        ? [...f.audienceTeamIds, teamId]
        : f.audienceTeamIds.filter((id) => id !== teamId),
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (form.questions.length === 0) errs.questions = "Add at least one question.";
    if (form.deadline && form.releaseDate && form.deadline <= form.releaseDate) {
      errs.deadline = "Deadline must be after the release date.";
    }
    if (form.reminderType === "EVERY_X_DAYS" && (!form.reminderIntervalDays || form.reminderIntervalDays < 1)) {
      errs.reminderIntervalDays = "Interval must be at least 1 day.";
    }
    form.questions.forEach((q, i) => {
      if (!q.prompt.trim()) errs[`q_${q.id}`] = `Question ${i + 1} needs a prompt.`;
      if ((q.type === "SINGLE" || q.type === "MULTI") && (q.options ?? []).length < 2)
        errs[`q_opts_${q.id}`] = `Question ${i + 1} needs at least 2 options.`;
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const hasSettingsErr = errs.title || errs.questions || errs.deadline || errs.reminderIntervalDays;
      setActiveTab(hasSettingsErr ? "settings" : "questions");
    }
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const survey: Survey = {
      id: initial?.id ?? uid(),
      title: form.title.trim(),
      description: form.description.trim(),
      anonymous: form.anonymous,
      minGroupSize: form.minGroupSize,
      recurrence: form.recurrence,
      status: form.status,
      questions: form.questions,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      audienceType: form.audienceType,
      audienceTeamIds: form.audienceType === "SPECIFIC_TEAMS" ? form.audienceTeamIds : undefined,
      audienceSupervisorId: form.audienceType === "SUPERVISOR_BASED" ? form.audienceSupervisorId : undefined,
      audience: audienceLabel(form.audienceType),
      releaseDate: form.releaseDate?.toISOString(),
      deadline: form.deadline?.toISOString(),
      reminderType: form.reminderType,
      reminderIntervalDays: form.reminderType === "EVERY_X_DAYS" ? form.reminderIntervalDays : undefined,
      visibilityScope: form.visibilityScope,
    };
    onSave(survey);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit survey" : "Create survey"}</DialogTitle>
          <DialogDescription>
            Configure the pulse survey settings and questions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="questions">
              Questions{form.questions.length > 0 ? ` (${form.questions.length})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* ── Settings tab ── */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            {/* Title */}
            <FormField label="Survey title" htmlFor="sv-title" error={errors.title} required>
              <Input
                id="sv-title"
                placeholder="e.g. Q3 engagement pulse"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                error={!!errors.title}
              />
            </FormField>

            {/* Description */}
            <FormField label="Description" htmlFor="sv-desc">
              <Textarea
                id="sv-desc"
                placeholder="What is this survey about?"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
              />
            </FormField>

            {/* Audience type */}
            <FormField label="Audience type" htmlFor="sv-audience-type">
              <Select
                value={form.audienceType}
                onValueChange={(v) => set("audienceType", v as AudienceType)}
              >
                <SelectTrigger id="sv-audience-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVERYONE">Everyone</SelectItem>
                  <SelectItem value="SUPERVISOR_BASED">Supervisor-based</SelectItem>
                  <SelectItem value="SPECIFIC_TEAMS">Specific teams</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Supervisor picker */}
            {form.audienceType === "SUPERVISOR_BASED" && (
              <FormField label="Supervisor" htmlFor="sv-supervisor">
                <Combobox
                  options={supervisorOptions}
                  value={form.audienceSupervisorId}
                  onChange={(v) => set("audienceSupervisorId", v)}
                  placeholder="Select supervisor…"
                  searchPlaceholder="Search supervisors…"
                  emptyText="No supervisors found."
                />
              </FormField>
            )}

            {/* Team checkboxes */}
            {form.audienceType === "SPECIFIC_TEAMS" && (
              <FormField label="Teams">
                <div className="space-y-2 rounded-xl border border-[color:var(--border-primary)] p-3">
                  {teams.length === 0 && (
                    <p className="text-xs text-[color:var(--text-tertiary)]">No teams found.</p>
                  )}
                  {teams.map((team) => (
                    <label key={team.id} className="flex cursor-pointer items-center gap-2.5">
                      <Checkbox
                        checked={form.audienceTeamIds.includes(team.id)}
                        onCheckedChange={(checked) => toggleTeam(team.id, !!checked)}
                        id={`team-${team.id}`}
                      />
                      <span className="text-sm text-[color:var(--text-primary)]">{team.name}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            )}

            {/* Audience preview */}
            {audienceCount && (
              <p className="text-xs text-[color:var(--text-tertiary)]">
                Who receives this: <span className="font-medium text-[color:var(--text-secondary)]">{audienceCount}</span>
              </p>
            )}

            {/* Anonymous + min group size */}
            <div className="flex items-center justify-between rounded-xl border border-[color:var(--border-primary)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-primary)]">Anonymous responses</p>
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  Respondent identities are never shown in results.
                </p>
              </div>
              <Switch
                checked={form.anonymous}
                onCheckedChange={(v) => set("anonymous", v)}
                aria-label="Anonymous responses"
              />
            </div>

            <FormField
              label={`Minimum group size: ${form.minGroupSize}`}
              htmlFor="sv-mgs"
              hint="Results are hidden below this threshold."
            >
              <div className="pt-2">
                <Slider
                  min={2}
                  max={10}
                  value={[form.minGroupSize]}
                  onValueChange={([v]) => set("minGroupSize", v)}
                />
              </div>
            </FormField>

            {/* Release date + Deadline */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Release date" htmlFor="sv-release">
                <DatePicker
                  value={form.releaseDate}
                  onChange={(d) => set("releaseDate", d)}
                  placeholder="Pick a date"
                />
              </FormField>
              <FormField label="Deadline" htmlFor="sv-deadline" error={errors.deadline}>
                <DatePicker
                  value={form.deadline}
                  onChange={(d) => set("deadline", d)}
                  placeholder="Pick a date"
                />
              </FormField>
            </div>

            {/* Recurrence + Visibility */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Recurrence" htmlFor="sv-recurrence">
                <Select
                  value={form.recurrence}
                  onValueChange={(v) => set("recurrence", v as Recurrence)}
                >
                  <SelectTrigger id="sv-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["NONE", "WEEKLY", "BI_WEEKLY", "MONTHLY", "BI_MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as Recurrence[]).map((r) => (
                      <SelectItem key={r} value={r}>{RECURRENCE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Visibility scope" htmlFor="sv-visibility">
                <Select
                  value={form.visibilityScope}
                  onValueChange={(v) => set("visibilityScope", v as VisibilityScope)}
                >
                  <SelectTrigger id="sv-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["ADMIN_ONLY", "HR_ADMIN", "SUPERVISOR_BASED", "TEAM_LEADS", "EVERYONE"] as VisibilityScope[]).map((vs) => (
                      <SelectItem key={vs} value={vs}>{VISIBILITY_LABEL[vs]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* Reminders */}
            <div className="space-y-3">
              <FormField label="Reminders" htmlFor="sv-reminder">
                <Select
                  value={form.reminderType}
                  onValueChange={(v) => set("reminderType", v as ReminderType)}
                >
                  <SelectTrigger id="sv-reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["NONE", "DAILY", "EVERY_X_DAYS", "WEEKLY"] as ReminderType[]).map((r) => (
                      <SelectItem key={r} value={r}>{REMINDER_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {form.reminderType === "EVERY_X_DAYS" && (
                <FormField
                  label="Interval (days)"
                  htmlFor="sv-reminder-interval"
                  error={errors.reminderIntervalDays}
                >
                  <Input
                    id="sv-reminder-interval"
                    type="number"
                    min={1}
                    value={form.reminderIntervalDays}
                    onChange={(e) => set("reminderIntervalDays", Math.max(1, parseInt(e.target.value, 10) || 1))}
                    error={!!errors.reminderIntervalDays}
                  />
                </FormField>
              )}
            </div>
          </TabsContent>

          {/* ── Questions tab ── */}
          <TabsContent value="questions" className="mt-4 space-y-3">
            {errors.questions && (
              <p className="flex items-center gap-1.5 text-sm text-[color:var(--color-error-500)]">
                <AlertCircle size={14} /> {errors.questions}
              </p>
            )}

            {form.questions.length === 0 && (
              <div className="rounded-xl border border-dashed border-[color:var(--border-primary)] py-10 text-center">
                <p className="text-sm text-[color:var(--text-tertiary)]">No questions yet.</p>
              </div>
            )}

            {form.questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
              >
                {/* Question header row */}
                <div className="mb-3 flex items-center gap-2">
                  <GripVertical size={14} className="flex-shrink-0 text-[color:var(--text-quaternary)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                    Q{idx + 1}
                  </span>
                  <Select
                    value={q.type}
                    onValueChange={(v) =>
                      updateQuestion(q.id, {
                        type: v as QuestionType,
                        options: [],
                        scaleMin: v === "RATING" ? 1 : undefined,
                        scaleMax: v === "RATING" ? 5 : undefined,
                        scaleMinLabel: "",
                        scaleMaxLabel: "",
                        multiline: false,
                        maxChars: undefined,
                      })
                    }
                  >
                    <SelectTrigger className="ml-auto h-7 w-auto text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["RATING", "SINGLE", "MULTI", "TEXT"] as QuestionType[]).map((t) => (
                        <SelectItem key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(q.id, -1)}
                      disabled={idx === 0}
                      className="rounded p-1 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)] disabled:opacity-30"
                      aria-label="Move question up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(q.id, 1)}
                      disabled={idx === form.questions.length - 1}
                      className="rounded p-1 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)] disabled:opacity-30"
                      aria-label="Move question down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteQId(q.id)}
                      className="rounded p-1 text-[color:var(--color-error-500)] hover:bg-[color:var(--bg-secondary)]"
                      aria-label="Remove question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <Input
                  placeholder="Question prompt…"
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                  error={!!errors[`q_${q.id}`]}
                />
                {errors[`q_${q.id}`] && (
                  <p className="mt-1 text-xs text-[color:var(--color-error-500)]">
                    {errors[`q_${q.id}`]}
                  </p>
                )}

                {/* RATING scale fields */}
                {q.type === "RATING" && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Min value" htmlFor={`q-smin-${q.id}`}>
                        <Input
                          id={`q-smin-${q.id}`}
                          type="number"
                          value={q.scaleMin ?? 1}
                          onChange={(e) => updateQuestion(q.id, { scaleMin: parseInt(e.target.value, 10) || 1 })}
                        />
                      </FormField>
                      <FormField label="Max value" htmlFor={`q-smax-${q.id}`}>
                        <Input
                          id={`q-smax-${q.id}`}
                          type="number"
                          value={q.scaleMax ?? 5}
                          onChange={(e) => updateQuestion(q.id, { scaleMax: parseInt(e.target.value, 10) || 5 })}
                        />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Min label" htmlFor={`q-sminl-${q.id}`}>
                        <Input
                          id={`q-sminl-${q.id}`}
                          placeholder="e.g. Not at all"
                          value={q.scaleMinLabel ?? ""}
                          onChange={(e) => updateQuestion(q.id, { scaleMinLabel: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Max label" htmlFor={`q-smaxl-${q.id}`}>
                        <Input
                          id={`q-smaxl-${q.id}`}
                          placeholder="e.g. Extremely"
                          value={q.scaleMaxLabel ?? ""}
                          onChange={(e) => updateQuestion(q.id, { scaleMaxLabel: e.target.value })}
                        />
                      </FormField>
                    </div>
                  </div>
                )}

                {/* SINGLE / MULTI options */}
                {(q.type === "SINGLE" || q.type === "MULTI") && (
                  <div className="mt-3 space-y-2">
                    {(q.options ?? []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, oi)}
                          className="rounded p-1 text-[color:var(--text-quaternary)] hover:text-[color:var(--color-error-500)]"
                          aria-label="Remove option"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    {errors[`q_opts_${q.id}`] && (
                      <p className="text-xs text-[color:var(--color-error-500)]">
                        {errors[`q_opts_${q.id}`]}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => addOption(q.id)}
                    >
                      <Plus size={12} /> Add option
                    </Button>
                  </div>
                )}

                {/* TEXT fields */}
                {q.type === "TEXT" && (
                  <div className="mt-3 space-y-2">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <Checkbox
                        checked={!!q.multiline}
                        onCheckedChange={(checked) => updateQuestion(q.id, { multiline: !!checked })}
                        id={`q-multiline-${q.id}`}
                      />
                      <span className="text-sm text-[color:var(--text-primary)]">Multi-line answer</span>
                    </label>
                    <FormField label="Max characters (optional)" htmlFor={`q-maxchars-${q.id}`}>
                      <Input
                        id={`q-maxchars-${q.id}`}
                        type="number"
                        min={1}
                        placeholder="No limit"
                        value={q.maxChars ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          updateQuestion(q.id, { maxChars: val });
                        }}
                      />
                    </FormField>
                  </div>
                )}

                {/* Required toggle */}
                <div className="mt-3 flex items-center gap-2.5">
                  <Checkbox
                    checked={!!q.required}
                    onCheckedChange={(checked) => updateQuestion(q.id, { required: !!checked })}
                    id={`q-required-${q.id}`}
                  />
                  <label
                    htmlFor={`q-required-${q.id}`}
                    className="cursor-pointer text-sm text-[color:var(--text-primary)]"
                  >
                    Required
                  </label>
                </div>
              </div>
            ))}

            <Button type="button" variant="secondary" onClick={addQuestion} className="w-full">
              <Plus size={14} /> Add question
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex justify-end gap-2 border-t border-[color:var(--border-primary)] pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {initial ? "Save changes" : "Create survey"}
          </Button>
        </div>

        {/* Remove question confirm */}
        <AlertDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove question?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteQId) removeQuestion(deleteQId);
                  setDeleteQId(null);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function HRSurveysPage() {
  const { surveys, loading, error, reload, save, remove, activate, deactivate } = useSurveys();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Survey | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setBuilderOpen(true);
  };

  const openEdit = (s: Survey) => {
    setEditing(s);
    setBuilderOpen(true);
  };

  const handleSave = (survey: Survey) => {
    save(survey);
    toast.success(editing ? "Survey updated." : "Survey created.");
  };

  const handleDelete = () => {
    if (!deletingId) return;
    remove(deletingId);
    setDeletingId(null);
    toast.success("Survey deleted.");
  };

  const handleActivate = () => {
    if (!activatingId) return;
    activate(activatingId);
    setActivatingId(null);
    toast.success("Survey activated — it is now live.");
  };

  const handleDeactivate = () => {
    if (!deactivatingId) return;
    deactivate(deactivatingId);
    setDeactivatingId(null);
    toast.success("Survey closed.");
  };

  const columns: Column<Survey>[] = [
    {
      header: "Title",
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{s.title}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
            {s.audienceType ? AUDIENCE_TYPE_LABEL[s.audienceType] : (s.audience ?? "—")}
            {" · "}
            {RECURRENCE_LABEL[s.recurrence]}
          </p>
        </div>
      ),
    },
    {
      header: "Questions",
      cell: (s) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{s.questions.length}</span>
      ),
    },
    {
      header: "Anonymity",
      cell: (s) => (
        <Badge variant={s.anonymous ? "success" : "neutral"}>
          {s.anonymous ? "Anonymous" : "Named"}
        </Badge>
      ),
    },
    {
      header: "Deadline",
      cell: (s) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {s.deadline
            ? new Date(s.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
            : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (s) => (
        <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
      ),
    },
    {
      header: "",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          {s.status === "DRAFT" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActivatingId(s.id); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="Activate survey"
            >
              <Play size={12} /> Activate
            </button>
          )}
          {s.status === "ACTIVE" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeactivatingId(s.id); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="Deactivate survey"
            >
              <Square size={12} /> Deactivate
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openEdit(s); }}
            className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
            aria-label="Edit survey"
          >
            <Pencil size={14} />
          </button>
          {s.status === "DRAFT" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
              className="rounded-lg p-1.5 text-[color:var(--color-error-500)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="Delete survey"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
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
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3">
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
      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <button
            onClick={() => void reload()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
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
        onClose={() => setBuilderOpen(false)}
        initial={editing}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Existing responses will be orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate confirm */}
      <AlertDialog open={!!activatingId} onOpenChange={(o) => !o && setActivatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate survey?</AlertDialogTitle>
            <AlertDialogDescription>
              Once active, the survey will be visible to employees in its audience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate}>Activate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivatingId} onOpenChange={(o) => !o && setDeactivatingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              The survey will be set to closed and will no longer accept responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>Close survey</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
