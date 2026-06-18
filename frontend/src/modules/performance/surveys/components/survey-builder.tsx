"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
  AlertCircle,
  Lock,
  Users,
  Search,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Checkbox,
  DatePicker,
} from "@/shared/ui";
import { FormField } from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useAudienceOptions } from "../hooks/use-audience-options";
import { usePreviewAudience } from "../hooks/use-preview-audience";
import type {
  SurveyDetail,
  QuestionType,
  RecurringType,
  AudienceType,
  Visibility,
  ReminderFrequency,
  CreateSurveyInput,
  QuestionInput,
  AudienceConfigInput,
} from "../types/surveys.types";
import {
  RECURRING_TYPE_LABEL,
  VISIBILITY_LABEL,
  QUESTION_TYPE_LABEL,
  REMINDER_FREQUENCY_LABEL,
} from "../types/surveys.types";

// ─── Local builder state ──────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

// A question in the builder carries a client id for stable list keys.
interface DraftQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  isRequired: boolean;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
}

interface BuilderState {
  name: string;
  audienceType: AudienceType;
  audienceSupervisorIds: string[];
  audienceTeamIds: string[];
  isAnonymous: boolean;
  recurringType: RecurringType;
  releaseDate: Date | undefined;
  deadline: Date | undefined;
  reminderFrequency: ReminderFrequency | "NONE";
  reminderEveryXDays: number;
  visibility: Visibility;
  questions: DraftQuestion[];
}

function defaultBuilder(): BuilderState {
  return {
    name: "",
    audienceType: "EVERYONE",
    audienceSupervisorIds: [],
    audienceTeamIds: [],
    isAnonymous: false,
    recurringType: "ONE_TIME",
    releaseDate: new Date(),
    deadline: undefined,
    reminderFrequency: "NONE",
    reminderEveryXDays: 7,
    visibility: "SUPERVISOR_BASED",
    questions: [],
  };
}

function defaultQuestion(): DraftQuestion {
  return {
    id: uid(),
    type: "SHORT_ANSWER",
    questionText: "",
    isRequired: false,
    options: [],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
  };
}

const QUESTION_TYPES: QuestionType[] = [
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "LINEAR_SCALE",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
];

const RECURRING_TYPES: RecurringType[] = [
  "ONE_TIME",
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "BI_MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
];

const VISIBILITIES: Visibility[] = [
  "EVERYONE",
  "SUPERVISOR_BASED",
  "TEAM_BASED",
  "HR_ROOT_ONLY",
  "SPECIFIC_TEAMS",
];

const REMINDER_OPTIONS: (ReminderFrequency | "NONE")[] = [
  "NONE",
  "DAILY",
  "EVERY_X_DAYS",
  "WEEKLY",
];

function buildAudienceConfigs(state: BuilderState): AudienceConfigInput[] {
  if (state.audienceType === "SUPERVISOR_BASED") {
    return state.audienceSupervisorIds.map((supervisorId) => ({ supervisorId }));
  }
  if (state.audienceType === "SPECIFIC_TEAMS") {
    return state.audienceTeamIds.map((teamId) => ({ teamId }));
  }
  return [];
}

/**
 * Coerce a question's stored `options` into the editor's `string[]`. API-created
 * questions store a JSON array, but seeded questions store `{ choices: [...] }`,
 * and the detail DTO types the field as `unknown` — so handle string[], object[]
 * (use `label`), and the `{ choices }` shape, falling back to an empty list.
 */
function normalizeOptions(raw: unknown): string[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { choices?: unknown }).choices)
      ? (raw as { choices: unknown[] }).choices
      : [];
  return arr.map((o) =>
    typeof o === "string" ? o : String((o as { label?: unknown })?.label ?? o ?? ""),
  );
}

// ─── Multi-select checkbox list (searchable) ─────────────────────────────────

interface MultiSelectProps {
  options: { id: string; label: string; sublabel?: string | null }[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
}

function MultiSelectChecklist({
  options,
  selected,
  onToggle,
  searchPlaceholder,
  emptyText,
  disabled,
}: MultiSelectProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-2 rounded-xl border border-[color:var(--border-primary)] p-3">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-quaternary)]"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-9"
          disabled={disabled}
        />
      </div>
      <div className="max-h-44 space-y-1.5 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-1 py-2 text-xs text-[color:var(--text-tertiary)]">{emptyText}</p>
        )}
        {filtered.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-[color:var(--bg-secondary)]"
          >
            <Checkbox
              checked={selected.includes(o.id)}
              onCheckedChange={(checked) => onToggle(o.id, !!checked)}
              disabled={disabled}
              id={`ms-${o.id}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-[color:var(--text-primary)]">
                {o.label}
              </span>
              {o.sublabel && (
                <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                  {o.sublabel}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="px-1 text-xs text-[color:var(--text-tertiary)]">
          {selected.length} selected
        </p>
      )}
    </div>
  );
}

// ─── Builder dialog ───────────────────────────────────────────────────────────

export interface SurveyBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  /** Full detail when editing; null/undefined when creating. */
  initial?: SurveyDetail | null;
  /** Detail is still loading (edit mode). */
  loading?: boolean;
  saving?: boolean;
  onSave: (input: CreateSurveyInput) => void;
}

export function SurveyBuilderDialog({
  open,
  onClose,
  initial,
  loading,
  saving,
  onSave,
}: SurveyBuilderDialogProps) {
  const [form, setForm] = useState<BuilderState>(defaultBuilder());
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Activated surveys lock most fields; only name + visibility stay editable.
  const isLocked = !!initial && initial.occurrenceCount > 0;

  const optionsQuery = useAudienceOptions(open);
  const supervisors = optionsQuery.data?.supervisors ?? [];
  const teams = optionsQuery.data?.teams ?? [];

  // Populate from initial when the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        audienceType: initial.audienceType,
        audienceSupervisorIds: initial.audienceConfigs
          .map((c) => c.supervisorId)
          .filter((v): v is string => !!v),
        audienceTeamIds: initial.audienceConfigs
          .map((c) => c.teamId)
          .filter((v): v is string => !!v),
        isAnonymous: initial.isAnonymous,
        recurringType: initial.recurringType,
        releaseDate: toDate(initial.releaseDate),
        deadline: toDate(initial.deadline),
        reminderFrequency: initial.reminderConfig?.frequency ?? "NONE",
        reminderEveryXDays: initial.reminderConfig?.everyXDays ?? 7,
        visibility: initial.visibility,
        questions: initial.questions
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => ({
            id: uid(),
            type: q.type,
            questionText: q.questionText,
            isRequired: q.isRequired,
            options: normalizeOptions(q.options),
            scaleMin: q.scaleMin ?? 1,
            scaleMax: q.scaleMax ?? 5,
            scaleMinLabel: q.scaleMinLabel ?? "",
            scaleMaxLabel: q.scaleMaxLabel ?? "",
          })),
      });
    } else {
      setForm(defaultBuilder());
    }
    setErrors({});
    setActiveTab("settings");
  }, [open, initial]);

  const set = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Question helpers ──
  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, defaultQuestion()] }));

  const updateQuestion = (qid: string, patch: Partial<DraftQuestion>) =>
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
        q.id === qid ? { ...q, options: [...q.options, ""] } : q,
      ),
    }));

  const updateOption = (qid: string, idx: number, val: string) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o, i) => (i === idx ? val : o)) }
          : q,
      ),
    }));

  const removeOption = (qid: string, idx: number) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) =>
        q.id === qid ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q,
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

  const toggleSupervisor = (id: string, checked: boolean) =>
    setForm((f) => ({
      ...f,
      audienceSupervisorIds: checked
        ? [...f.audienceSupervisorIds, id]
        : f.audienceSupervisorIds.filter((s) => s !== id),
    }));

  const toggleTeam = (id: string, checked: boolean) =>
    setForm((f) => ({
      ...f,
      audienceTeamIds: checked
        ? [...f.audienceTeamIds, id]
        : f.audienceTeamIds.filter((t) => t !== id),
    }));

  // ── Live audience preview (debounced) ──
  const previewInput = useMemo(
    () => ({ audienceType: form.audienceType, audienceConfigs: buildAudienceConfigs(form) }),
    [form],
  );
  const debouncedPreview = useDebounce(previewInput, 350);
  const previewQuery = usePreviewAudience(debouncedPreview, open);

  // ── Validation (mirrors server rules) ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.deadline) {
      errs.deadline = "Deadline is required.";
    } else if (form.releaseDate && form.deadline <= form.releaseDate) {
      errs.deadline = "Deadline must be after the release date.";
    }
    if (form.questions.length === 0) errs.questions = "Add at least one question.";
    if (
      form.reminderFrequency === "EVERY_X_DAYS" &&
      (!form.reminderEveryXDays || form.reminderEveryXDays < 1)
    ) {
      errs.reminderEveryXDays = "Interval must be at least 1 day.";
    }
    if (form.audienceType === "SUPERVISOR_BASED" && form.audienceSupervisorIds.length === 0) {
      errs.audience = "Select at least one supervisor.";
    }
    if (form.audienceType === "SPECIFIC_TEAMS" && form.audienceTeamIds.length === 0) {
      errs.audience = "Select at least one team.";
    }
    form.questions.forEach((q, i) => {
      if (!q.questionText.trim()) errs[`q_${q.id}`] = `Question ${i + 1} needs a prompt.`;
      if (
        (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") &&
        q.options.filter((o) => o.trim()).length < 1
      ) {
        errs[`q_opts_${q.id}`] = `Question ${i + 1} needs at least one option.`;
      }
      if (q.type === "LINEAR_SCALE" && q.scaleMax <= q.scaleMin) {
        errs[`q_scale_${q.id}`] = `Question ${i + 1} max must be greater than min.`;
      }
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const settingsErr =
        errs.name || errs.deadline || errs.reminderEveryXDays || errs.audience;
      setActiveTab(settingsErr ? "settings" : "questions");
    }
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const questions: QuestionInput[] = form.questions.map((q, idx) => {
      const base: QuestionInput = {
        type: q.type,
        questionText: q.questionText.trim(),
        isRequired: q.isRequired,
        orderIndex: idx,
      };
      if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
        base.options = q.options.map((o) => o.trim()).filter((o) => o);
      }
      if (q.type === "LINEAR_SCALE") {
        base.scaleMin = q.scaleMin;
        base.scaleMax = q.scaleMax;
        if (q.scaleMinLabel.trim()) base.scaleMinLabel = q.scaleMinLabel.trim();
        if (q.scaleMaxLabel.trim()) base.scaleMaxLabel = q.scaleMaxLabel.trim();
      }
      return base;
    });

    const input: CreateSurveyInput = {
      name: form.name.trim(),
      deadline: form.deadline!.toISOString(),
      releaseDate: form.releaseDate?.toISOString(),
      recurringType: form.recurringType,
      audienceType: form.audienceType,
      isAnonymous: form.isAnonymous,
      isActive: false, // drafts only; activation is a separate action
      visibility: form.visibility,
      questions,
      audienceConfigs: buildAudienceConfigs(form),
    };

    if (form.reminderFrequency !== "NONE") {
      input.reminderConfig = {
        frequency: form.reminderFrequency,
        ...(form.reminderFrequency === "EVERY_X_DAYS"
          ? { everyXDays: form.reminderEveryXDays }
          : {}),
      };
    }

    onSave(input);
  };

  const lockedNote = (
    <span className="inline-flex items-center gap-1 text-xs text-[color:var(--text-tertiary)]">
      <Lock size={11} /> Locked after activation
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        // The builder hosts portaled Selects and date pickers; toggling those reads
        // as an "outside" interaction and was slamming the dialog shut mid-edit.
        // A multi-field form shouldn't close on an outside click anyway, so block
        // every outside-interaction close — only X / Cancel / Esc dismiss it.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{initial ? "Edit survey" : "Create survey"}</DialogTitle>
          <DialogDescription>
            {isLocked
              ? "This survey is active — only its name and visibility can be edited."
              : "Configure the pulse survey settings and questions."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 w-full rounded-lg bg-[color:var(--bg-tertiary)]" />
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="questions">
                Questions{form.questions.length > 0 ? ` (${form.questions.length})` : ""}
              </TabsTrigger>
            </TabsList>

            {/* ── Settings ── */}
            <TabsContent value="settings" className="mt-4 space-y-4">
              <FormField label="Survey name" htmlFor="sv-name" error={errors.name} required>
                <Input
                  id="sv-name"
                  placeholder="e.g. Q3 engagement pulse"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  error={!!errors.name}
                />
              </FormField>

              {/* Audience type */}
              <FormField
                label="Audience type"
                htmlFor="sv-audience-type"
                hint={isLocked ? undefined : "Who is asked to respond."}
              >
                {isLocked ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={
                        form.audienceType === "EVERYONE"
                          ? "Everyone"
                          : form.audienceType === "SUPERVISOR_BASED"
                            ? "Supervisor-based"
                            : "Specific teams"
                      }
                      disabled
                    />
                    {lockedNote}
                  </div>
                ) : (
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
                )}
              </FormField>

              {/* Supervisor multi-select */}
              {form.audienceType === "SUPERVISOR_BASED" && !isLocked && (
                <FormField label="Supervisors" error={errors.audience}>
                  <MultiSelectChecklist
                    options={supervisors.map((s) => ({
                      id: s.id,
                      label: s.name,
                      sublabel: s.jobTitle,
                    }))}
                    selected={form.audienceSupervisorIds}
                    onToggle={toggleSupervisor}
                    searchPlaceholder="Search supervisors…"
                    emptyText={
                      optionsQuery.isLoading ? "Loading…" : "No supervisors found."
                    }
                  />
                </FormField>
              )}

              {/* Team multi-select */}
              {form.audienceType === "SPECIFIC_TEAMS" && !isLocked && (
                <FormField label="Teams" error={errors.audience}>
                  <MultiSelectChecklist
                    options={teams.map((t) => ({ id: t.id, label: t.name }))}
                    selected={form.audienceTeamIds}
                    onToggle={toggleTeam}
                    searchPlaceholder="Search teams…"
                    emptyText={optionsQuery.isLoading ? "Loading…" : "No teams found."}
                  />
                </FormField>
              )}

              {/* Live audience preview */}
              <div className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-3">
                <Users
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-[color:var(--text-tertiary)]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--text-primary)]">
                    {previewQuery.isError
                      ? "Could not load the audience preview."
                      : previewQuery.data
                        ? `Who will receive this: ${previewQuery.data.count} ${
                            previewQuery.data.count === 1 ? "employee" : "employees"
                          }`
                        : "Estimating who will receive this…"}
                  </p>
                  {previewQuery.data && previewQuery.data.members.length > 0 && (
                    <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                      {previewQuery.data.members
                        .slice(0, 4)
                        .map((m) => m.name)
                        .join(", ")}
                      {previewQuery.data.count > 4
                        ? ` and ${previewQuery.data.count - 4} more`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Anonymity */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--border-primary)] px-4 py-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                    Anonymous responses {isLocked && lockedNote}
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    Respondent identities are never shown in results. Min group size is 3.
                  </p>
                </div>
                <Switch
                  checked={form.isAnonymous}
                  onCheckedChange={(v) => set("isAnonymous", v)}
                  disabled={isLocked}
                  aria-label="Anonymous responses"
                />
              </div>

              {/* Release + deadline */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Release date"
                  htmlFor="sv-release"
                  hint={isLocked ? undefined : "Defaults to today."}
                >
                  <DatePicker
                    value={form.releaseDate}
                    onChange={(d) => set("releaseDate", d)}
                    placeholder="Pick a date"
                    disabled={isLocked}
                  />
                </FormField>
                <FormField label="Deadline" htmlFor="sv-deadline" error={errors.deadline} required>
                  <DatePicker
                    value={form.deadline}
                    onChange={(d) => set("deadline", d)}
                    placeholder="Pick a date"
                    disabled={isLocked}
                  />
                </FormField>
              </div>

              {/* Recurrence + visibility */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Recurrence" htmlFor="sv-recurrence">
                  <Select
                    value={form.recurringType}
                    onValueChange={(v) => set("recurringType", v as RecurringType)}
                    disabled={isLocked}
                  >
                    <SelectTrigger id="sv-recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRING_TYPES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {RECURRING_TYPE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Visibility" htmlFor="sv-visibility">
                  <Select
                    value={form.visibility}
                    onValueChange={(v) => set("visibility", v as Visibility)}
                  >
                    <SelectTrigger id="sv-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITIES.map((vs) => (
                        <SelectItem key={vs} value={vs}>
                          {VISIBILITY_LABEL[vs]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {/* Reminders */}
              <div className="space-y-3">
                <FormField label="Reminders" htmlFor="sv-reminder">
                  <Select
                    value={form.reminderFrequency}
                    onValueChange={(v) =>
                      set("reminderFrequency", v as ReminderFrequency | "NONE")
                    }
                    disabled={isLocked}
                  >
                    <SelectTrigger id="sv-reminder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r === "NONE" ? "None" : REMINDER_FREQUENCY_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {form.reminderFrequency === "EVERY_X_DAYS" && (
                  <FormField
                    label="Interval (days)"
                    htmlFor="sv-reminder-interval"
                    error={errors.reminderEveryXDays}
                  >
                    <Input
                      id="sv-reminder-interval"
                      type="number"
                      min={1}
                      value={form.reminderEveryXDays}
                      onChange={(e) =>
                        set(
                          "reminderEveryXDays",
                          Math.max(1, parseInt(e.target.value, 10) || 1),
                        )
                      }
                      error={!!errors.reminderEveryXDays}
                      disabled={isLocked}
                    />
                  </FormField>
                )}
              </div>
            </TabsContent>

            {/* ── Questions ── */}
            <TabsContent value="questions" className="mt-4 space-y-3">
              {isLocked && (
                <p className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
                  <Lock size={12} /> Questions are locked once the survey is active.
                </p>
              )}
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
                  <div className="mb-3 flex items-center gap-2">
                    <GripVertical
                      size={14}
                      className="flex-shrink-0 text-[color:var(--text-quaternary)]"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Q{idx + 1}
                    </span>
                    <Select
                      value={q.type}
                      onValueChange={(v) =>
                        updateQuestion(q.id, {
                          type: v as QuestionType,
                          options:
                            v === "MULTIPLE_CHOICE" || v === "CHECKBOX" ? q.options : [],
                        })
                      }
                      disabled={isLocked}
                    >
                      <SelectTrigger className="ml-auto h-7 w-auto text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {QUESTION_TYPE_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isLocked && (
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
                    )}
                  </div>

                  <Input
                    placeholder="Question prompt…"
                    value={q.questionText}
                    onChange={(e) => updateQuestion(q.id, { questionText: e.target.value })}
                    error={!!errors[`q_${q.id}`]}
                    disabled={isLocked}
                  />
                  {errors[`q_${q.id}`] && (
                    <p className="mt-1 text-xs text-[color:var(--color-error-500)]">
                      {errors[`q_${q.id}`]}
                    </p>
                  )}

                  {/* Linear scale */}
                  {q.type === "LINEAR_SCALE" && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Min value" htmlFor={`q-smin-${q.id}`}>
                          <Input
                            id={`q-smin-${q.id}`}
                            type="number"
                            value={q.scaleMin}
                            onChange={(e) =>
                              updateQuestion(q.id, {
                                scaleMin: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            disabled={isLocked}
                          />
                        </FormField>
                        <FormField label="Max value" htmlFor={`q-smax-${q.id}`}>
                          <Input
                            id={`q-smax-${q.id}`}
                            type="number"
                            value={q.scaleMax}
                            onChange={(e) =>
                              updateQuestion(q.id, {
                                scaleMax: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            disabled={isLocked}
                          />
                        </FormField>
                      </div>
                      {errors[`q_scale_${q.id}`] && (
                        <p className="text-xs text-[color:var(--color-error-500)]">
                          {errors[`q_scale_${q.id}`]}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Min label" htmlFor={`q-sminl-${q.id}`}>
                          <Input
                            id={`q-sminl-${q.id}`}
                            placeholder="e.g. Not at all"
                            value={q.scaleMinLabel}
                            onChange={(e) =>
                              updateQuestion(q.id, { scaleMinLabel: e.target.value })
                            }
                            disabled={isLocked}
                          />
                        </FormField>
                        <FormField label="Max label" htmlFor={`q-smaxl-${q.id}`}>
                          <Input
                            id={`q-smaxl-${q.id}`}
                            placeholder="e.g. Extremely"
                            value={q.scaleMaxLabel}
                            onChange={(e) =>
                              updateQuestion(q.id, { scaleMaxLabel: e.target.value })
                            }
                            disabled={isLocked}
                          />
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* Multiple choice / checkbox options */}
                  {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") && (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${oi + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(q.id, oi, e.target.value)}
                            className="flex-1"
                            disabled={isLocked}
                          />
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, oi)}
                              className="rounded p-1 text-[color:var(--text-quaternary)] hover:text-[color:var(--color-error-500)]"
                              aria-label="Remove option"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      {errors[`q_opts_${q.id}`] && (
                        <p className="text-xs text-[color:var(--color-error-500)]">
                          {errors[`q_opts_${q.id}`]}
                        </p>
                      )}
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => addOption(q.id)}
                        >
                          <Plus size={12} /> Add option
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Required toggle */}
                  <div className="mt-3 flex items-center gap-2.5">
                    <Checkbox
                      checked={q.isRequired}
                      onCheckedChange={(checked) =>
                        updateQuestion(q.id, { isRequired: !!checked })
                      }
                      disabled={isLocked}
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

              {!isLocked && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addQuestion}
                  className="w-full"
                >
                  <Plus size={14} /> Add question
                </Button>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[color:var(--border-primary)] pt-4">
          <Badge variant="neutral">Saved as draft</Badge>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create survey"}
            </Button>
          </div>
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
