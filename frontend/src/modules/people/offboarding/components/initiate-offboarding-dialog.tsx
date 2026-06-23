"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
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
} from "@/shared/ui";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useOffboardings } from "../hooks/use-offboarding";
import { useCreateOffboarding } from "../hooks/use-create-offboarding";
import { useClearanceTemplates } from "../hooks/use-clearance-templates";

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
  // Only fetch clearance versions while the dialog is open.
  const { templates, loading: templatesLoading } = useClearanceTemplates(open);

  const [empId, setEmpId] = useState<string>("");
  const [tenderDate, setTenderDate] = useState<string>(todayIso());
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const [clearanceTemplateId, setClearanceTemplateId] = useState<string>("");
  const [errors, setErrors] = useState<{ emp?: string; effective?: string; template?: string }>({});

  // Default the version picker to the org default once versions load (unless the user picked one).
  useEffect(() => {
    if (!open || clearanceTemplateId) return;
    const preferred = templates.find((t) => t.isDefault) ?? templates[0];
    if (preferred) setClearanceTemplateId(preferred.id);
  }, [open, templates, clearanceTemplateId]);

  function reset() {
    setEmpId("");
    setTenderDate(todayIso());
    setEffectiveDate("");
    setNewSupervisorId("");
    setClearanceTemplateId("");
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

  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: `${t.name}${t.isDefault ? " · Default" : ""} · ${t.signatories.length} signator${
      t.signatories.length === 1 ? "y" : "ies"
    }`,
  }));

  async function handleSubmit() {
    const next: typeof errors = {};
    if (!empId) next.emp = "Select an employee.";
    if (!clearanceTemplateId) next.template = "Select a clearance version.";
    if (!effectiveDate) next.effective = "Effective date is required.";
    else if (effectiveDate < tenderDate)
      next.effective = "Effective date cannot be before the tender date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const selected = employees.find((e) => e.id === empId);
    try {
      const created = await create({
        employeeId: empId,
        tenderDate,
        effectiveDate,
        clearanceTemplateId,
        ...(newSupervisorId ? { newSupervisorId } : {}),
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

          <FormField label="Clearance version" required error={errors.template}>
            <Combobox
              options={templateOptions}
              value={clearanceTemplateId}
              onChange={(v) => setClearanceTemplateId(v)}
              placeholder={
                templatesLoading
                  ? "Loading versions…"
                  : templateOptions.length === 0
                    ? "No clearance versions configured"
                    : "Select a clearance version…"
              }
              searchPlaceholder="Search versions…"
              emptyText="No clearance versions. Add one under Clearance setup."
            />
          </FormField>

          <div className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3">
            <div className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B54708]"
                aria-hidden="true"
              />
              <p className="text-xs text-[#B54708]">
                If this employee has direct reports or leads teams, pick who takes over.
                Otherwise leave this blank.
              </p>
            </div>
            <div className="mt-3">
              <FormField label="Reassign reports & team leadership to (optional)">
                <Combobox
                  options={reassignOptions}
                  value={newSupervisorId}
                  onChange={(v) => setNewSupervisorId(v)}
                  placeholder="Select a new supervisor…"
                  searchPlaceholder="Search employees…"
                  emptyText="No employees available."
                />
              </FormField>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={creating}>
            {creating ? "Initiating…" : "Initiate offboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
