"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
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
  const [attachment, setAttachment] = useState<File | null>(null);
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

  function reset() {
    setEmpId("");
    setTenderDate(todayIso());
    setEffectiveDate("");
    setClearanceTemplateId("");
    setAttachment(null);
    setNewSupervisorId("");
    setNewTeamLeaderId("");
    setErrors({});
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
        ...(attachment ? { attachment } : {}),
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate offboarding</DialogTitle>
          <DialogDescription>
            Set the tender and effective dates, then run the clearance process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <FormField label="Tender date" htmlFor="off-tender">
            <Input
              id="off-tender"
              type="date"
              value={tenderDate}
              onChange={(e) => setTenderDate(e.target.value)}
            />
          </FormField>

          <FormField label="Effective date" htmlFor="off-effective" required error={errors.effective}>
            <Input
              id="off-effective"
              type="date"
              min={tenderDate || todayIso()}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </FormField>

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

          <FormField label="Attachment (optional)" htmlFor="off-attachment">
            <div className="flex items-center gap-3">
              <Input
                key={attachment ? "attachment-selected" : "attachment-empty"}
                id="off-attachment"
                type="file"
                onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
              />
              {attachment ? (
                <span className="inline-flex max-w-[180px] items-center gap-1 truncate text-xs text-[color:var(--text-tertiary)]">
                  <Paperclip className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{attachment.name}</span>
                </span>
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
                ) : null}
                {needsTeamLeaderReassignment ? (
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
      </DialogContent>
    </Dialog>
  );
}
