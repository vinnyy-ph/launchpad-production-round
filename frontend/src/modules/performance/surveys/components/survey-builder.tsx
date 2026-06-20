"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Type,
  AlignLeft,
  BarChart3,
  CircleDot,
  CheckSquare,
  CalendarDays,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { cn } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useAudienceOptions } from "../hooks/use-audience-options";
import { usePreviewAudience } from "../hooks/use-preview-audience";
import { useTeams } from "@/modules/people/teams";
import { useAutosave } from "@/modules/performance/shared/use-autosave";
import { DraftSaveStatus } from "@/modules/performance/shared/draft-save-status";
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
import { RECURRING_TYPE_LABEL, QUESTION_TYPE_LABEL } from "../types/surveys.types";

// ─── Local builder state ──────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

function isToday(d?: Date): boolean {
  if (!d) return true;
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function formatDate(d?: Date): string {
  return d
    ? d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "—";
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
    reminderEveryXDays: 3,
    visibility: "SUPERVISOR_BASED",
    questions: [],
  };
}

function defaultQuestion(type: QuestionType): DraftQuestion {
  return {
    id: uid(),
    type,
    questionText: "",
    isRequired: false,
    options: type === "MULTIPLE_CHOICE" || type === "CHECKBOX" ? ["Option 1", "Option 2"] : [],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
  };
}

// Cadences shown when a survey recurs (everything except the one-time case).
const CADENCES: RecurringType[] = [
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "BI_MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
];

// Audience selector copy (builder-local; the list view keeps the short labels).
const AUDIENCE_OPTIONS: { value: AudienceType; label: string }[] = [
  { value: "EVERYONE", label: "Everyone with an active status" },
  { value: "SUPERVISOR_BASED", label: "By supervisor" },
  { value: "SPECIFIC_TEAMS", label: "Specific teams" },
];

// "Who can see results?" copy (builder-local), ordered per the design.
const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "SUPERVISOR_BASED", label: "Supervisors (their reports only)" },
  { value: "EVERYONE", label: "Everyone" },
  { value: "TEAM_BASED", label: "Each team sees its own" },
  { value: "HR_ROOT_ONLY", label: "HR and the CEO only" },
  { value: "SPECIFIC_TEAMS", label: "Specific teams" },
];

const QUESTION_MENU: { type: QuestionType; icon: LucideIcon; label: string; desc: string }[] = [
  { type: "SHORT_ANSWER", icon: Type, label: "Short answer", desc: "A single line of text" },
  { type: "LONG_ANSWER", icon: AlignLeft, label: "Long answer", desc: "A paragraph of text" },
  { type: "LINEAR_SCALE", icon: BarChart3, label: "Linear scale", desc: "Rate on a number range" },
  { type: "MULTIPLE_CHOICE", icon: CircleDot, label: "Multiple choice", desc: "Pick one option" },
  { type: "CHECKBOX", icon: CheckSquare, label: "Checkbox", desc: "Pick one or more" },
];

const QUESTION_TYPES: QuestionType[] = QUESTION_MENU.map((m) => m.type);

const QUESTION_HINT: Partial<Record<QuestionType, string>> = {
  SHORT_ANSWER: "Respondents type a short, single-line answer.",
  LONG_ANSWER: "Respondents type a longer, paragraph answer.",
};

function buildAudienceConfigs(state: BuilderState): AudienceConfigInput[] {
  if (state.audienceType === "SUPERVISOR_BASED") {
    return state.audienceSupervisorIds.map((supervisorId) => ({ supervisorId }));
  }
  if (state.audienceType === "SPECIFIC_TEAMS") {
    return state.audienceTeamIds.map((teamId) => ({ teamId }));
  }
  return [];
}

// Pure validation (no React state) so the same rules drive both the on-submit error display
// and the autosave "is this complete enough for the server to accept a create?" gate. Mirrors
// the backend create requirements (name, future deadline, ≥1 valid question, named audience).
function computeBuilderErrors(form: BuilderState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.name.trim()) errs.name = "Name is required.";
  if (!form.deadline) {
    errs.deadline = "Deadline is required.";
  } else if (form.releaseDate && form.deadline <= form.releaseDate) {
    errs.deadline = "Deadline must be after the release date.";
  }
  if (form.questions.length === 0) errs.questions = "Add at least one question.";
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
  return errs;
}

// Serializable form snapshot for autosave change-detection and the localStorage buffer.
// Question client ids are intentionally dropped (they regenerate on hydrate, so including
// them would make the snapshot look perpetually dirty); restore re-assigns fresh ids.
function toBuilderSnapshot(form: BuilderState) {
  return {
    name: form.name,
    audienceType: form.audienceType,
    audienceSupervisorIds: form.audienceSupervisorIds,
    audienceTeamIds: form.audienceTeamIds,
    isAnonymous: form.isAnonymous,
    recurringType: form.recurringType,
    releaseDate: form.releaseDate ? form.releaseDate.toISOString() : null,
    deadline: form.deadline ? form.deadline.toISOString() : null,
    reminderFrequency: form.reminderFrequency,
    reminderEveryXDays: form.reminderEveryXDays,
    visibility: form.visibility,
    questions: form.questions.map((q) => ({
      type: q.type,
      questionText: q.questionText,
      isRequired: q.isRequired,
      options: q.options,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleMinLabel: q.scaleMinLabel,
      scaleMaxLabel: q.scaleMaxLabel,
    })),
  };
}

type BuilderSnapshot = ReturnType<typeof toBuilderSnapshot>;

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

// ─── Section card (Basics / Who & privacy / Schedule) ─────────────────────────

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)]">
      <div className="flex items-center gap-2">
        <Icon size={17} className="text-[color:var(--text-quaternary)]" aria-hidden="true" />
        <h3 className="text-[15px] font-bold text-[color:var(--text-primary)]">{title}</h3>
      </div>
      <p className="mb-4 mt-0.5 text-[13px] text-[color:var(--text-tertiary)]">{subtitle}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// A subtle, icon-led informational note (mirrors the design's blue callouts).
function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-[10px] bg-[color:var(--bg-secondary)] px-3 py-2.5 text-xs leading-relaxed text-[color:var(--text-tertiary)]">
      <Info size={14} className="mt-0.5 flex-none text-[color:var(--brand-blue)]" aria-hidden="true" />
      <span>{children}</span>
    </div>
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
  /** Saves the survey. `activate` chains activation after the draft is created. */
  onSave: (input: CreateSurveyInput, opts?: { activate?: boolean }) => void;
  /** Current draft id (= editing id); null while creating, set once autosave creates it. */
  draftId?: string | null;
  /** Silent autosave persist. Creates when no id, updates otherwise; returns the draft id. */
  onAutosave?: (input: CreateSurveyInput, draftId: string | null) => Promise<string>;
}

export function SurveyBuilderDialog({
  open,
  onClose,
  initial,
  loading,
  saving,
  onSave,
  draftId = null,
  onAutosave,
}: SurveyBuilderDialogProps) {
  const [form, setForm] = useState<BuilderState>(defaultBuilder());
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [launchOpen, setLaunchOpen] = useState(false);

  // Activated surveys lock most fields; only name + visibility stay editable.
  const isLocked = !!initial && initial.occurrenceCount > 0;

  const optionsQuery = useAudienceOptions(open);
  const supervisors = optionsQuery.data?.supervisors ?? [];
  const teams = optionsQuery.data?.teams ?? [];

  // Member counts aren't on the audience options (id + name only), so read them from the
  // people module's teams list to warn — purely in the UI — that anonymous results from a
  // sub-3-member targeted team won't reach that team's supervisor.
  const { teams: teamsWithCounts } = useTeams();
  const smallTargetedTeams =
    form.isAnonymous && form.audienceType === "SPECIFIC_TEAMS"
      ? teamsWithCounts.filter(
          (t) => form.audienceTeamIds.includes(t.id) && t.memberCount < 3,
        )
      : [];

  // When an anonymous survey targets a sub-3-member team, results are forced to HR + the
  // managers above that team's supervisor (enforced server-side). Lock the selector so it
  // can't be set to something the backend would override anyway — purely a UI affordance;
  // the saved `visibility` value is left untouched.
  const visibilityLockedToHrHeads = smallTargetedTeams.length > 0;

  // ── Autosave (drafts only; an activated/locked survey keeps manual save) ──
  const snapshot = useMemo(() => toBuilderSnapshot(form), [form]);
  const canPersist = useMemo(() => Object.keys(computeBuilderErrors(form)).length === 0, [form]);
  // saveRef defers to the latest buildInput/onAutosave (both defined below) so the hook's
  // save closure is never stale.
  const saveRef = useRef<(id: string | null) => Promise<string>>(async (id) => id ?? "");
  const autosave = useAutosave({
    open,
    enabled: !isLocked && !!onAutosave,
    loading: !!loading,
    draftId,
    snapshot,
    canPersist,
    storageKey: `autosave:survey:${draftId ?? "new"}`,
    onSave: (id) => saveRef.current(id),
  });

  // Hydrate once per open (and wait for an edit's detail to load). Guarded so that autosave
  // creating the draft — which flips `initial` from null to the saved survey — does not
  // re-hydrate over the in-progress edits.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (loading || hydratedRef.current) return;
    hydratedRef.current = true;
    const next: BuilderState = initial
      ? {
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
          reminderEveryXDays: initial.reminderConfig?.everyXDays ?? 3,
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
        }
      : defaultBuilder();
    setForm(next);
    setErrors({});
    setActiveTab("settings");
    setLaunchOpen(false);
    autosave.setBaseline(toBuilderSnapshot(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, loading]);

  /** Apply a recovered localStorage buffer to the form, then dismiss the prompt. */
  const restoreFromBuffer = (buffered: BuilderSnapshot) => {
    setForm({
      name: buffered.name,
      audienceType: buffered.audienceType,
      audienceSupervisorIds: buffered.audienceSupervisorIds,
      audienceTeamIds: buffered.audienceTeamIds,
      isAnonymous: buffered.isAnonymous,
      recurringType: buffered.recurringType,
      releaseDate: buffered.releaseDate ? new Date(buffered.releaseDate) : undefined,
      deadline: buffered.deadline ? new Date(buffered.deadline) : undefined,
      reminderFrequency: buffered.reminderFrequency,
      reminderEveryXDays: buffered.reminderEveryXDays,
      visibility: buffered.visibility,
      questions: buffered.questions.map((q) => ({ id: uid(), ...q })),
    });
    autosave.acceptRecovery();
  };

  const set = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Recurrence + reminders (UI splits the single enums into mode + cadence) ──
  const isRecurring = form.recurringType !== "ONE_TIME";
  const remindersOn = form.reminderFrequency !== "NONE";

  const setRecurrenceMode = (mode: string) =>
    set("recurringType", mode === "recurring" ? (isRecurring ? form.recurringType : "WEEKLY") : "ONE_TIME");

  const setRemindersMode = (mode: string) =>
    set("reminderFrequency", mode === "on" ? (remindersOn ? form.reminderFrequency : "DAILY") : "NONE");

  const setReminderFrequency = (freq: ReminderFrequency) =>
    setForm((f) => ({
      ...f,
      reminderFrequency: freq,
      reminderEveryXDays: freq === "EVERY_X_DAYS" ? 3 : f.reminderEveryXDays,
    }));

  // ── Question helpers ──
  const addQuestion = (type: QuestionType) =>
    setForm((f) => ({ ...f, questions: [...f.questions, defaultQuestion(type)] }));

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

  const noneSelected =
    (form.audienceType === "SUPERVISOR_BASED" && form.audienceSupervisorIds.length === 0) ||
    (form.audienceType === "SPECIFIC_TEAMS" && form.audienceTeamIds.length === 0);

  const audienceCount = previewQuery.data?.count ?? 0;

  // ── Validation (mirrors server rules; see computeBuilderErrors) ──
  const validate = (): boolean => {
    const errs = computeBuilderErrors(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const settingsErr = errs.name || errs.deadline || errs.audience;
      setActiveTab(settingsErr ? "settings" : "questions");
    }
    return Object.keys(errs).length === 0;
  };

  const buildInput = (): CreateSurveyInput => {
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
      isActive: false, // drafts only; activation is a separate, chained action
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

    return input;
  };

  // Keep the autosave save closure pointed at the current buildInput / onAutosave.
  saveRef.current = async (id) => {
    if (!onAutosave) return id ?? "";
    return onAutosave(buildInput(), id);
  };

  // "Save & close" → draft only. "Create & activate" → confirm, then draft + activate.
  // Manual save takes over: cancel any pending autosave and drop the local buffer.
  const submit = (activate: boolean) => {
    if (!validate()) return;
    autosave.cancel();
    autosave.clearBuffer();
    onSave(buildInput(), { activate });
  };

  const openLaunch = () => {
    if (validate()) setLaunchOpen(true);
  };

  const lockedNote = (
    <span className="inline-flex items-center gap-1 text-xs font-normal text-[color:var(--text-tertiary)]">
      <Lock size={11} /> Locked after activation
    </span>
  );

  const recurrenceLabel = isRecurring ? RECURRING_TYPE_LABEL[form.recurringType] : "One-time";
  const scheduleSummary = `Opens ${isToday(form.releaseDate) ? "today" : formatDate(form.releaseDate)} · ${recurrenceLabel}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        // The builder hosts portaled Selects and date pickers; toggling those reads
        // as an "outside" interaction and was slamming the dialog shut mid-edit.
        // A multi-field form shouldn't close on an outside click anyway, so block
        // every outside-interaction close — only X / Cancel / Esc dismiss it.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-[color:var(--border-primary)] px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {initial ? "Edit survey" : "Create survey"}
          </DialogTitle>
          <DialogDescription>
            {isLocked
              ? "This survey is active — only its name and visibility can be edited."
              : "Set up your pulse, then add the questions you want to ask."}
          </DialogDescription>
        </DialogHeader>

        {!isLocked && autosave.recoverable != null && (
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-6 py-2.5 text-[13px] text-[color:var(--text-secondary)]">
            <span>You have unsaved changes from a previous session.</span>
            <span className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => restoreFromBuffer(autosave.recoverable as BuilderSnapshot)}
                className="font-semibold text-[color:var(--text-primary)] underline underline-offset-2"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={autosave.discardRecovery}
                className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
              >
                Discard
              </button>
            </span>
          </div>
        )}

        {loading && !hydratedRef.current ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 w-full rounded-lg bg-[color:var(--bg-tertiary)]" />
            ))}
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="px-6 pt-4">
              <TabsList>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="questions">
                  Questions{form.questions.length > 0 ? ` (${form.questions.length})` : ""}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
              {/* ── Settings ── */}
              <TabsContent value="settings" className="mt-0 space-y-4">
                <SectionCard icon={Type} title="Basics" subtitle="What is this pulse called?">
                  <FormField
                    label="Survey name"
                    htmlFor="sv-name"
                    error={errors.name}
                    required
                    hint="Employees will see this name when they open the survey."
                  >
                    <Input
                      id="sv-name"
                      placeholder="e.g. Q3 engagement pulse"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      error={!!errors.name}
                    />
                  </FormField>
                </SectionCard>

                <SectionCard
                  icon={Users}
                  title="Who & privacy"
                  subtitle="Who gets it, and how their answers are handled."
                >
                  <FormField
                    label="Who receives this?"
                    htmlFor="sv-audience-type"
                    error={errors.audience}
                    required
                  >
                    {isLocked ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={
                            AUDIENCE_OPTIONS.find((o) => o.value === form.audienceType)?.label ?? ""
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
                          {AUDIENCE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>

                  {/* Supervisor multi-select */}
                  {form.audienceType === "SUPERVISOR_BASED" && !isLocked && (
                    <div>
                      <p className="mb-2 text-[12.5px] text-[color:var(--text-tertiary)]">
                        Pick supervisors. Their direct reports and everyone below them are included.
                      </p>
                      <MultiSelectChecklist
                        options={supervisors.map((s) => ({
                          id: s.id,
                          label: s.name,
                          sublabel: s.jobTitle,
                        }))}
                        selected={form.audienceSupervisorIds}
                        onToggle={toggleSupervisor}
                        searchPlaceholder="Search supervisors…"
                        emptyText={optionsQuery.isLoading ? "Loading…" : "No supervisors found."}
                      />
                    </div>
                  )}

                  {/* Team multi-select */}
                  {form.audienceType === "SPECIFIC_TEAMS" && !isLocked && (
                    <div>
                      <p className="mb-2 text-[12.5px] text-[color:var(--text-tertiary)]">
                        Pick the teams that should receive this.
                      </p>
                      <MultiSelectChecklist
                        options={teams.map((t) => ({ id: t.id, label: t.name }))}
                        selected={form.audienceTeamIds}
                        onToggle={toggleTeam}
                        searchPlaceholder="Search teams…"
                        emptyText={optionsQuery.isLoading ? "Loading…" : "No teams found."}
                      />
                    </div>
                  )}

                  {/* Recipients box (live preview) */}
                  <div className="flex items-start gap-3 rounded-xl border border-[color:var(--border-secondary)] bg-[color:var(--bg-secondary)] px-4 py-3">
                    <Users
                      size={18}
                      className="mt-0.5 flex-shrink-0 text-[color:var(--text-tertiary)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 text-[13px]">
                      {previewQuery.isError ? (
                        <p className="text-[color:var(--text-tertiary)]">
                          Could not load the audience preview.
                        </p>
                      ) : noneSelected ? (
                        <p className="text-[color:var(--text-tertiary)]">No one selected yet</p>
                      ) : previewQuery.data ? (
                        <>
                          <p className="text-[color:var(--text-primary)]">
                            Going to{" "}
                            <b className="font-bold">
                              {audienceCount} {audienceCount === 1 ? "employee" : "employees"}
                            </b>
                          </p>
                          {previewQuery.data.members.length > 0 && (
                            <p className="mt-0.5 truncate text-[color:var(--text-tertiary)]">
                              {previewQuery.data.members
                                .slice(0, 4)
                                .map((m) => m.name)
                                .join(", ")}
                              {audienceCount > 4 ? ` and ${audienceCount - 4} more` : ""}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[color:var(--text-tertiary)]">
                          Estimating who will receive this…
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Anonymity */}
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-[color:var(--border-primary)] px-4 py-3.5">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                        Anonymous responses {isLocked && lockedNote}
                      </p>
                      <p className="mt-0.5 max-w-[46ch] text-xs text-[color:var(--text-tertiary)]">
                        Responses are never linked to names. To protect that, we hide any group
                        smaller than 3.
                      </p>
                    </div>
                    <Switch
                      checked={form.isAnonymous}
                      onCheckedChange={(v) => set("isAnonymous", v)}
                      disabled={isLocked}
                      aria-label="Anonymous responses"
                      className="mt-0.5"
                    />
                  </div>

                  {/* Small-team anonymity reminder (UI only — enforced server-side at view time) */}
                  {smallTargetedTeams.length > 0 && (
                    <div className="flex items-start gap-2 rounded-[10px] border border-[#FEDF89] bg-[color:var(--color-warning-50)] px-3 py-2.5 text-xs leading-relaxed text-[color:var(--color-warning-600)]">
                      <Lock size={14} className="mt-0.5 flex-none" aria-hidden="true" />
                      <span>
                        Heads up: {smallTargetedTeams.map((t) => t.name).join(", ")}{" "}
                        {smallTargetedTeams.length === 1 ? "has" : "have"} fewer than 3 members.
                        Because this survey is anonymous, those teams&apos; results won&apos;t be
                        shown to their own supervisor — only HR and the managers above them can view
                        them.
                      </span>
                    </div>
                  )}

                  {/* Visibility */}
                  <FormField label="Who can see results?" htmlFor="sv-visibility">
                    <Select
                      value={form.visibility}
                      onValueChange={(v) => set("visibility", v as Visibility)}
                      disabled={visibilityLockedToHrHeads}
                    >
                      <SelectTrigger id="sv-visibility">
                        {visibilityLockedToHrHeads ? (
                          <span>HR and heads above</span>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InfoNote>
                      {visibilityLockedToHrHeads
                        ? "This anonymous survey targets a team with fewer than 3 members, so results are limited to HR and the managers above that team's supervisor. Anonymous responses are never tied back to names."
                        : "This controls who sees the summary. Even when someone can view results, anonymous responses are never tied back to names."}
                    </InfoNote>
                  </FormField>
                </SectionCard>

                <SectionCard
                  icon={CalendarDays}
                  title="Schedule"
                  subtitle="When it opens, when it closes, and whether it repeats."
                >
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
                    <FormField
                      label="Deadline"
                      htmlFor="sv-deadline"
                      error={errors.deadline}
                      required
                    >
                      <DatePicker
                        value={form.deadline}
                        onChange={(d) => set("deadline", d)}
                        placeholder="Pick a date"
                        disabled={isLocked}
                      />
                    </FormField>
                  </div>

                  {/* Recurrence */}
                  <FormField label="Recurrence" htmlFor="sv-recurrence">
                    <Select
                      value={isRecurring ? "recurring" : "once"}
                      onValueChange={setRecurrenceMode}
                      disabled={isLocked}
                    >
                      <SelectTrigger id="sv-recurrence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">One-time</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                    {isRecurring && (
                      <div className="mt-2.5">
                        <Select
                          value={form.recurringType}
                          onValueChange={(v) => set("recurringType", v as RecurringType)}
                          disabled={isLocked}
                        >
                          <SelectTrigger aria-label="Cadence">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CADENCES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {RECURRING_TYPE_LABEL[c]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <InfoNote>
                          Each round opens on this cadence and gets its own deadline, using the same
                          gap as the first one.
                        </InfoNote>
                      </div>
                    )}
                  </FormField>

                  {/* Reminders */}
                  <FormField label="Reminders" htmlFor="sv-reminder">
                    <Select
                      value={remindersOn ? "on" : "none"}
                      onValueChange={setRemindersMode}
                      disabled={isLocked}
                    >
                      <SelectTrigger id="sv-reminder">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="on">Remind people who haven&apos;t answered</SelectItem>
                      </SelectContent>
                    </Select>
                    {remindersOn && (
                      <div className="mt-2.5">
                        <Select
                          value={form.reminderFrequency === "NONE" ? "DAILY" : form.reminderFrequency}
                          onValueChange={(v) => setReminderFrequency(v as ReminderFrequency)}
                          disabled={isLocked}
                        >
                          <SelectTrigger aria-label="Reminder frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="EVERY_X_DAYS">Every 3 days</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">
                          Reminders stop once someone answers or the deadline passes.
                        </p>
                      </div>
                    )}
                  </FormField>
                </SectionCard>
              </TabsContent>

              {/* ── Questions ── */}
              <TabsContent value="questions" className="mt-0 space-y-3">
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
                  <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] py-10 text-center">
                    <p className="text-sm text-[color:var(--text-tertiary)]">
                      No questions yet. Add your first one to get started.
                    </p>
                  </div>
                )}

                {form.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)]"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <GripVertical
                        size={16}
                        className="flex-shrink-0 text-[color:var(--text-quaternary)]"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-bold text-[color:var(--text-primary)]">
                        Question {idx + 1}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Select
                          value={q.type}
                          onValueChange={(v) => {
                            const t = v as QuestionType;
                            const isOpt = t === "MULTIPLE_CHOICE" || t === "CHECKBOX";
                            updateQuestion(q.id, {
                              type: t,
                              options: isOpt
                                ? q.options.length
                                  ? q.options
                                  : ["Option 1", "Option 2"]
                                : [],
                            });
                          }}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8 w-auto gap-1 text-xs font-semibold">
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
                          <>
                            <button
                              type="button"
                              onClick={() => moveQuestion(q.id, -1)}
                              disabled={idx === 0}
                              className="rounded-lg border border-[color:var(--border-primary)] p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-secondary)] disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(q.id, 1)}
                              disabled={idx === form.questions.length - 1}
                              className="rounded-lg border border-[color:var(--border-primary)] p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-secondary)] disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ChevronDown size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteQId(q.id)}
                              className="rounded-lg border border-[color:var(--border-primary)] p-1.5 text-[color:var(--text-quaternary)] hover:border-[color:var(--color-error-200)] hover:bg-[color:var(--color-error-50)] hover:text-[color:var(--color-error-500)]"
                              aria-label="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <Input
                      placeholder="Type your question"
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

                    {/* Per-type config */}
                    <div className="mt-3 border-t border-[color:var(--border-secondary)] pt-3">
                      {QUESTION_HINT[q.type] && (
                        <p className="text-[12.5px] text-[color:var(--text-quaternary)]">
                          {QUESTION_HINT[q.type]}
                        </p>
                      )}

                      {/* Linear scale */}
                      {q.type === "LINEAR_SCALE" && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <FormField label="From" htmlFor={`q-smin-${q.id}`}>
                              <Select
                                value={String(q.scaleMin)}
                                onValueChange={(v) =>
                                  updateQuestion(q.id, { scaleMin: parseInt(v, 10) })
                                }
                                disabled={isLocked}
                              >
                                <SelectTrigger id={`q-smin-${q.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from(new Set([0, 1, q.scaleMin]))
                                    .sort((a, b) => a - b)
                                    .map((n) => (
                                      <SelectItem key={n} value={String(n)}>
                                        {n}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="To" htmlFor={`q-smax-${q.id}`}>
                              <Select
                                value={String(q.scaleMax)}
                                onValueChange={(v) =>
                                  updateQuestion(q.id, { scaleMax: parseInt(v, 10) })
                                }
                                disabled={isLocked}
                              >
                                <SelectTrigger id={`q-smax-${q.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from(new Set([3, 4, 5, 7, 10, q.scaleMax]))
                                    .sort((a, b) => a - b)
                                    .map((n) => (
                                      <SelectItem key={n} value={String(n)}>
                                        {n}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="Low label" htmlFor={`q-sminl-${q.id}`}>
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
                            <FormField label="High label" htmlFor={`q-smaxl-${q.id}`}>
                              <Input
                                id={`q-smaxl-${q.id}`}
                                placeholder="e.g. Completely"
                                value={q.scaleMaxLabel}
                                onChange={(e) =>
                                  updateQuestion(q.id, { scaleMaxLabel: e.target.value })
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
                        </div>
                      )}

                      {/* Multiple choice / checkbox options */}
                      {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") && (
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "h-4 w-4 flex-none border-[1.5px] border-[color:var(--border-strong)]",
                                  q.type === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded-[5px]",
                                )}
                                aria-hidden="true"
                              />
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
                                  <X size={14} />
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
                    </div>

                    {/* Required toggle */}
                    <div className="mt-3 flex items-center gap-2.5 border-t border-[color:var(--border-secondary)] pt-3">
                      <Switch
                        checked={q.isRequired}
                        onCheckedChange={(checked) => updateQuestion(q.id, { isRequired: checked })}
                        disabled={isLocked}
                        id={`q-required-${q.id}`}
                        aria-label="Required"
                      />
                      <label
                        htmlFor={`q-required-${q.id}`}
                        className="cursor-pointer text-[13.5px] font-semibold text-[color:var(--text-tertiary)]"
                      >
                        Required
                      </label>
                    </div>
                  </div>
                ))}

                {!isLocked && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--border-strong)] bg-white py-3.5 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
                      >
                        <Plus size={17} /> Add question
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-[300px]">
                      {QUESTION_MENU.map((item) => (
                        <DropdownMenuItem
                          key={item.type}
                          onSelect={() => addQuestion(item.type)}
                          className="gap-3 py-2.5"
                        >
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[color:var(--bg-secondary)] text-[color:var(--text-tertiary)]">
                            <item.icon size={16} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-[color:var(--text-primary)]">
                              {item.label}
                            </span>
                            <span className="block text-xs text-[color:var(--text-tertiary)]">
                              {item.desc}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border-primary)] px-6 py-3.5">
          {!isLocked ? (
            <DraftSaveStatus
              status={autosave.status}
              lastSavedAt={autosave.lastSavedAt}
              canPersist={autosave.canPersist}
              onRetry={autosave.retry}
            />
          ) : (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--text-tertiary)]">
              <Lock size={13} /> Active survey
            </span>
          )}
          <div className="flex gap-2.5">
            {isLocked ? (
              <>
                <Button variant="secondary" onClick={onClose} disabled={saving}>
                  Close
                </Button>
                <Button onClick={() => submit(false)} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => submit(false)} disabled={saving || loading}>
                  Save &amp; close
                </Button>
                <Button onClick={openLaunch} disabled={saving || loading}>
                  {initial ? "Save & activate" : "Create & activate"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Launch confirmation — the folded-in review */}
        <AlertDialog open={launchOpen} onOpenChange={(o) => !o && setLaunchOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Activate this survey?</AlertDialogTitle>
              <AlertDialogDescription>
                Once it&apos;s live, it goes out to your audience right away and they&apos;ll be
                notified. Give it one last look:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <dl className="rounded-xl border border-[color:var(--border-primary)] px-4">
              {[
                { k: "Name", v: form.name.trim() || "Untitled pulse" },
                {
                  k: "Audience",
                  v: noneSelected
                    ? "No one selected yet"
                    : `${audienceCount} ${audienceCount === 1 ? "employee" : "employees"}`,
                },
                { k: "Privacy", v: form.isAnonymous ? "Anonymous" : "Named responses" },
                { k: "Schedule", v: scheduleSummary },
                {
                  k: "Questions",
                  v: `${form.questions.length} ${form.questions.length === 1 ? "question" : "questions"}`,
                },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex justify-between gap-3 border-b border-[color:var(--border-secondary)] py-2.5 text-[13.5px] last:border-b-0"
                >
                  <dt className="text-[color:var(--text-tertiary)]">{row.k}</dt>
                  <dd className="text-right font-semibold text-[color:var(--text-primary)]">
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  submit(true);
                }}
                disabled={saving}
              >
                {saving ? "Activating…" : "Activate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
