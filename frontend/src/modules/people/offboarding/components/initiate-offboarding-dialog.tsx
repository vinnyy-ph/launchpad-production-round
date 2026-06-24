"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Eye, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  UserAvatar,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useEmployeeProfile } from "@/modules/people/employees/hooks/use-employee-profile";
import { useOffboardings } from "../hooks/use-offboarding";
import { useCreateOffboarding } from "../hooks/use-create-offboarding";
import { useClearanceTemplateOptions } from "../hooks/use-clearance-templates";

interface InitiateOffboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new case id after offboarding is initiated. */
  onInitiated: (caseId: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parses a "yyyy-MM-dd" string into a local Date (undefined when empty/invalid). */
function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Formats a Date back to the "yyyy-MM-dd" string the offboarding API expects. */
function dateToIso(date?: Date): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Attachment upload limits — kept in sync with the backend offboarding upload middleware.
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const ALLOWED_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.pdf";

/** Formats a byte count into a short human-readable size (e.g. "1.2 MB"). */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** A stable key for a staged file, used for de-duplication and preview lookups. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}`;
}

/** The uppercased extension of a file name (e.g. "PDF"), or "FILE" when absent. */
function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : "FILE";
}

/** Two-letter initials from a full name, for avatar fallbacks. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** A titled section whose body can be collapsed and expanded (collapsed by default). */
function CollapsibleGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-semibold text-[color:var(--text-secondary)]">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-[color:var(--text-tertiary)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

/**
 * Initiates an offboarding case for an active employee. Self-contained: fetches the active
 * employees and existing cases it needs, and reports the created case id to the caller.
 */
export function InitiateOffboardingDialog({
  open,
  onOpenChange,
  onInitiated,
}: InitiateOffboardingDialogProps) {
  // Only fetch employees while the dialog is open.
  const { employees, loading: employeesLoading } = useEmployees(
    open ? { status: "active", limit: 200 } : {},
  );
  const { offboardings } = useOffboardings();
  const { create, creating } = useCreateOffboarding();
  // Only fetch clearance version options while the dialog is open.
  const { templates, loading: templatesLoading, error: templatesError } =
    useClearanceTemplateOptions(open);

  const [empId, setEmpId] = useState<string>("");
  const [tenderDate, setTenderDate] = useState<string>(todayIso());
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [clearanceTemplateId, setClearanceTemplateId] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  // Object URLs for previewing staged files, keyed by fileKey. Rebuilt whenever the
  // selection changes and revoked on cleanup to avoid leaking blob URLs.
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  // The staged file currently shown in the preview modal (null when closed).
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const [newTeamLeaderId, setNewTeamLeaderId] = useState<string>("");
  const [errors, setErrors] = useState<{
    emp?: string;
    effective?: string;
    clearance?: string;
    supervisor?: string;
    teamLeader?: string;
  }>({});
  const {
    employee: selectedEmployeeProfile,
    loading: profileLoading,
    error: profileError,
  } = useEmployeeProfile(empId || null);
  const clearanceError =
    errors.clearance ??
    templatesError ??
    (!templatesLoading && templates.length === 0 ? "No clearance versions are available." : undefined);
  const directReportCount = selectedEmployeeProfile?.directReports?.length ?? 0;
  const ledTeamCount = selectedEmployeeProfile?.ledTeams.length ?? 0;
  const needsSupervisorReassignment = directReportCount > 0;
  const needsTeamLeaderReassignment = ledTeamCount > 0;

  useEffect(() => {
    if (!open || clearanceTemplateId || templates.length === 0) return;
    const defaultTemplate = templates.find((template) => template.isDefault) ?? templates[0];
    setClearanceTemplateId(defaultTemplate.id);
  }, [clearanceTemplateId, open, templates]);

  useEffect(() => {
    setNewSupervisorId("");
    setNewTeamLeaderId("");
    setErrors((current) => ({ ...current, supervisor: undefined, teamLeader: undefined }));
  }, [empId]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const file of attachments) {
      urls[fileKey(file)] = URL.createObjectURL(file);
    }
    setPreviewUrls(urls);
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [attachments]);

  function reset() {
    setEmpId("");
    setTenderDate(todayIso());
    setEffectiveDate("");
    setClearanceTemplateId("");
    setAttachments([]);
    setAttachmentError("");
    setDragActive(false);
    setPreviewFile(null);
    setNewSupervisorId("");
    setNewTeamLeaderId("");
    setErrors({});
  }

  /**
   * Validates newly picked files (type + size + count), appends the valid ones to the
   * current selection (de-duplicated by name + size), and surfaces a message for any rejects.
   */
  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const file of Array.from(fileList)) {
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        rejected.push(`${file.name} (unsupported type)`);
      } else if (file.size > MAX_ATTACHMENT_BYTES) {
        rejected.push(`${file.name} (over 5 MB)`);
      } else {
        accepted.push(file);
      }
    }

    setAttachments((current) => {
      const seen = new Set(current.map(fileKey));
      const merged = [...current];
      for (const file of accepted) {
        const key = fileKey(file);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      if (merged.length > MAX_ATTACHMENTS) {
        rejected.push(`Only the first ${MAX_ATTACHMENTS} files are kept`);
        return merged.slice(0, MAX_ATTACHMENTS);
      }
      return merged;
    });

    setAttachmentError(rejected.length > 0 ? `Skipped: ${rejected.join(", ")}` : "");
  }

  /** Removes a single staged attachment by index. */
  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, i) => i !== index));
  }

  /** Opens the in-app preview modal for a staged file. */
  function openPreview(file: File) {
    setPreviewFile(file);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  // Exclude employees that already have an active offboarding case.
  const offboardingIds = useMemo(
    () => new Set(offboardings.filter((c) => c.status === "IN_PROGRESS").map((c) => c.employee.id)),
    [offboardings],
  );

  const selectableEmployees = useMemo(
    () => employees.filter((e) => !offboardingIds.has(e.id)),
    [employees, offboardingIds],
  );

  const empOptions = selectableEmployees.map((e) => ({
    value: e.id,
    label: `${e.fullName}${e.jobTitle ? ` · ${e.jobTitle}` : ""}`,
  }));

  const reassignOptions = employees
    .filter((e) => e.id !== empId)
    .map((e) => ({ value: e.id, label: `${e.fullName}${e.jobTitle ? ` · ${e.jobTitle}` : ""}` }));

  async function handleSubmit() {
    const next: typeof errors = {};
    if (!empId) next.emp = "Select an employee.";
    if (!effectiveDate) next.effective = "Effective date is required.";
    else if (effectiveDate < tenderDate)
      next.effective = "Effective date cannot be before the tender date.";
    if (!clearanceTemplateId) next.clearance = "Select a clearance version.";
    if (needsSupervisorReassignment && !newSupervisorId)
      next.supervisor = "Choose a new supervisor for direct reports.";
    if (needsTeamLeaderReassignment && !newTeamLeaderId)
      next.teamLeader = "Choose a new leader for led teams.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const selected = employees.find((e) => e.id === empId);
    try {
      const created = await create({
        employeeId: empId,
        tenderDate,
        effectiveDate,
        clearanceTemplateId,
        ...(attachments.length > 0 ? { attachments } : {}),
        ...(newSupervisorId ? { newSupervisorId } : {}),
        ...(newTeamLeaderId ? { newTeamLeaderId } : {}),
      });
      toast.success(`Offboarding initiated for ${selected?.fullName ?? "employee"}.`);
      reset();
      onOpenChange(false);
      onInitiated(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not initiate offboarding.");
    }
  }

  const previewFileUrl = previewFile ? previewUrls[fileKey(previewFile)] : undefined;
  const previewIsImage = previewFile?.type.startsWith("image/") ?? false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Initiate offboarding</DialogTitle>
          <DialogDescription>
            Set the tender and effective dates, then run the clearance process.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-2">
          <FormField label="Employee" required error={errors.emp}>
            <Combobox
              options={empOptions}
              value={empId}
              onChange={(v) => setEmpId(v)}
              placeholder={employeesLoading ? "Loading employees…" : "Select an active employee…"}
              searchPlaceholder="Search employees…"
              emptyText="No active employees available."
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tender date" htmlFor="off-tender">
              <DatePicker
                value={isoToDate(tenderDate)}
                onChange={(d) => setTenderDate(dateToIso(d))}
                placeholder="Pick a date"
              />
            </FormField>

            <FormField label="Effective date" htmlFor="off-effective" required error={errors.effective}>
              <DatePicker
                value={isoToDate(effectiveDate)}
                onChange={(d) => setEffectiveDate(dateToIso(d))}
                placeholder="Pick a date"
                minDate={isoToDate(tenderDate)}
              />
            </FormField>
          </div>

          <FormField label="Clearance version" required error={clearanceError}>
            <Select
              value={clearanceTemplateId}
              onValueChange={setClearanceTemplateId}
              disabled={templatesLoading || templates.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    templatesLoading ? "Loading clearance versions..." : "Select a clearance version"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.isDefault ? " (default)" : ""}
                    {` - ${template.signatoryCount} signator${template.signatoryCount === 1 ? "y" : "ies"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Attachments (optional)"
            htmlFor="off-attachment"
            error={attachmentError || undefined}
          >
            <div className="space-y-2">
              <input
                // Re-key on count so the native input clears after each selection,
                // letting the same file be re-added after it's removed.
                key={`attachment-input-${attachments.length}`}
                ref={attachmentInputRef}
                id="off-attachment"
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="sr-only"
                onChange={(event) => handleFilesSelected(event.target.files)}
              />

              {attachments.length < MAX_ATTACHMENTS ? (
                <button
                  type="button"
                  className={cn(
                    "flex min-h-[104px] w-full items-center justify-center rounded-md border border-dashed border-[color:var(--border-secondary)] bg-white px-4 py-6 text-center transition-colors",
                    dragActive && "border-[color:var(--gray-900)] bg-[color:var(--bg-secondary)]",
                  )}
                  onClick={() => attachmentInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    handleFilesSelected(event.dataTransfer.files);
                  }}
                >
                  <span className="flex items-center justify-center gap-2 text-sm text-[color:var(--text-tertiary)]">
                    <Upload className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                    <span>
                      Drag and drop or{" "}
                      <span className="font-semibold text-[color:var(--text-secondary)] underline underline-offset-2">
                        choose files
                      </span>
                      .
                    </span>
                  </span>
                </button>
              ) : null}

              <p className="text-xs text-[color:var(--text-tertiary)]">
                PNG, JPG, or PDF · up to 5 MB each · max {MAX_ATTACHMENTS} files
              </p>

              {attachments.length > 0 ? (
                <ul className="space-y-2">
                  {attachments.map((file, index) => {
                    const previewUrl = previewUrls[fileKey(file)];
                    const isImage = file.type.startsWith("image/");
                    return (
                      <li
                        key={fileKey(file)}
                        className="flex min-w-0 items-center gap-3 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[color:var(--border-primary)] bg-white">
                          {isImage && previewUrl ? (
                            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-0.5 text-[color:var(--text-tertiary)]">
                              <FileText className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                              <span className="rounded-sm bg-[#F04438] px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                                {fileExtension(file.name)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold text-[color:var(--text-primary)]"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Preview ${file.name}`}
                            onClick={() => openPreview(file)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </FormField>

          <div className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3">
            <div className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B54708]"
                aria-hidden="true"
              />
              <p className="text-xs text-[#B54708]">
                {empId
                  ? profileLoading
                    ? "Checking whether this employee has reports or led teams..."
                    : profileError
                      ? profileError
                      : needsSupervisorReassignment || needsTeamLeaderReassignment
                        ? "Complete the required handoffs before submitting this offboarding."
                        : "This employee has no direct reports or led teams to reassign."
                  : "Select an employee to check required report and team handoffs."}
              </p>
            </div>
            {needsSupervisorReassignment || needsTeamLeaderReassignment ? (
              <div className="mt-3 space-y-3">
                {needsSupervisorReassignment ? (
                  <div className="space-y-2">
                    <CollapsibleGroup title="View members">
                    <ul className="space-y-2">
                      {selectedEmployeeProfile?.directReports?.map((report) => (
                        <li
                          key={report.id}
                          className="flex items-center gap-3 rounded-lg border border-[#FEDF89] bg-white px-3 py-2"
                        >
                          <UserAvatar
                            src={null}
                            fallback={initials(report.fullName)}
                            className="h-8 w-8 flex-shrink-0"
                            fallbackClassName="text-xs font-bold text-[color:var(--text-primary)]"
                            fallbackStyle={{
                              background:
                                "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                              {report.fullName}
                            </p>
                            <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                              {report.jobTitle ?? "—"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    </CollapsibleGroup>
                    <FormField
                      label={`New supervisor for ${directReportCount} direct report${directReportCount === 1 ? "" : "s"}`}
                      required
                      error={errors.supervisor}
                    >
                      <Combobox
                        options={reassignOptions}
                        value={newSupervisorId}
                        onChange={(v) => setNewSupervisorId(v)}
                        placeholder="Select a new supervisor..."
                        searchPlaceholder="Search employees..."
                        emptyText="No employees available."
                      />
                    </FormField>
                  </div>
                ) : null}
                {needsTeamLeaderReassignment ? (
                  <div className="space-y-2">
                    <CollapsibleGroup title="View teams">
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployeeProfile?.ledTeams.map((team) => (
                          <span
                            key={team.id}
                            className="max-w-[160px] truncate rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-semibold text-[#067647]"
                          >
                            {team.name}
                          </span>
                        ))}
                      </div>
                    </CollapsibleGroup>
                    <FormField
                      label={`New leader for ${ledTeamCount} team${ledTeamCount === 1 ? "" : "s"}`}
                      required
                      error={errors.teamLeader}
                    >
                      <Combobox
                        options={reassignOptions}
                        value={newTeamLeaderId}
                        onChange={(v) => setNewTeamLeaderId(v)}
                        placeholder="Select a new team leader..."
                        searchPlaceholder="Search employees..."
                        emptyText="No employees available."
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={creating || profileLoading || templatesLoading || templates.length === 0}
          >
            {creating ? "Initiating…" : "Initiate offboarding"}
          </Button>
        </DialogFooter>

        <Dialog open={previewFile !== null} onOpenChange={(next) => !next && setPreviewFile(null)}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl">
            <DialogHeader className="min-w-0">
              <DialogTitle className="block truncate pr-8" title={previewFile?.name}>
                {previewFile?.name}
              </DialogTitle>
              <DialogDescription>
                {previewFile ? formatFileSize(previewFile.size) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[70vh] min-h-[240px] min-w-0 items-center justify-center overflow-auto rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)]">
              {previewFileUrl ? (
                previewIsImage ? (
                  <img
                    src={previewFileUrl}
                    alt={previewFile?.name ?? ""}
                    className="max-h-[70vh] w-auto max-w-full object-contain"
                  />
                ) : (
                  <iframe
                    src={previewFileUrl}
                    title={previewFile?.name ?? "Document preview"}
                    className="h-[70vh] w-full"
                  />
                )
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
