"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Textarea,
} from "@/shared/ui";
import { useAllEmployees } from "@/modules/people/employees/hooks/use-employees";
import { toEmployeeOption } from "@/modules/people/employees/employee-options";
import { PEOPLE_TEXT_LIMITS, validatePeopleText } from "@/modules/people/people-text";
import type {
  ClearanceSignatoryInput,
  ClearanceTemplate,
} from "../types/offboarding.types";

interface ClearanceVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omit to create a new version. */
  template?: ClearanceTemplate | null;
  saving: boolean;
  /** name + isDefault + signatories. `isDefault` is ignored on edit (managed separately). */
  onSubmit: (values: {
    name: string;
    isDefault: boolean;
    signatories: ClearanceSignatoryInput[];
  }) => void;
}

type Row = ClearanceSignatoryInput & { key: string };
type RowErrors = {
  employeeId?: string;
  purpose?: string;
  requirements?: string;
};

const CLEARANCE_FIELD_MESSAGES = {
  name: "Please enter a valid version name using letters, numbers, spaces, and common punctuation only.",
  purpose: "Please enter a valid purpose using letters, numbers, spaces, and common punctuation only.",
  requirements:
    "Please enter valid requirements using letters, numbers, spaces, and common punctuation only.",
};
const CLEARANCE_TEXT_RE = /^[A-Za-z0-9\s.,'&/()#:\-]+$/;

let rowSeq = 0;
function emptyRow(): Row {
  rowSeq += 1;
  return { key: `row-${rowSeq}`, employeeId: "", purpose: "", requirements: "" };
}

function validateClearanceText(
  value: string,
  field: keyof typeof CLEARANCE_FIELD_MESSAGES,
  maxLen: number,
): string | undefined {
  if (validatePeopleText(value, field, maxLen)) return CLEARANCE_FIELD_MESSAGES[field];
  if (value && !CLEARANCE_TEXT_RE.test(value)) return CLEARANCE_FIELD_MESSAGES[field];
  return undefined;
}

/**
 * Create/edit dialog for a clearance version: a name and an ordered list of signatories
 * (employee + what they clear + what they must verify). At least one signatory is required.
 */
export function ClearanceVersionDialog({
  open,
  onOpenChange,
  template,
  saving,
  onSubmit,
}: ClearanceVersionDialogProps) {
  const isEdit = Boolean(template);
  const { employees, loading: employeesLoading } = useAllEmployees({
    status: "active",
    enabled: open,
  });

  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [errors, setErrors] = useState<{ name?: string; signatories?: string }>({});
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({});

  // Reset the form whenever the dialog opens (prefill from the template when editing).
  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setIsDefault(template.isDefault);
      setRows(
        template.signatories.map((signatory) => ({
          key: signatory.id,
          employeeId: signatory.employee.id,
          purpose: signatory.purpose,
          requirements: signatory.requirements,
        })),
      );
    } else {
      setName("");
      setIsDefault(false);
      setRows([emptyRow()]);
    }
    setErrors({});
    setRowErrors({});
  }, [open, template]);

  const employeeOptions = employees.map(toEmployeeOption);

  function updateRow(key: string, patch: Partial<ClearanceSignatoryInput>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setErrors((current) => ({ ...current, signatories: undefined }));
    setRowErrors((current) => {
      const nextRow = { ...(current[key] ?? {}) };
      if ("employeeId" in patch) {
        nextRow.employeeId = patch.employeeId ? undefined : "Select a signatory employee.";
      }
      if (typeof patch.purpose === "string") {
        nextRow.purpose = patch.purpose.trim()
          ? validateClearanceText(patch.purpose, "purpose", PEOPLE_TEXT_LIMITS.CLEARANCE_PURPOSE)
          : "Purpose is required.";
      }
      if (typeof patch.requirements === "string") {
        nextRow.requirements = patch.requirements.trim()
          ? validateClearanceText(
              patch.requirements,
              "requirements",
              PEOPLE_TEXT_LIMITS.CLEARANCE_REQUIREMENTS,
            )
          : "Requirements are required.";
      }
      return { ...current, [key]: nextRow };
    });
  }

  function updateName(value: string) {
    setName(value);
    setErrors((current) => ({
      ...current,
      name: value.trim()
        ? validateClearanceText(value, "name", PEOPLE_TEXT_LIMITS.CLEARANCE_TEMPLATE_NAME)
        : "Version name is required.",
    }));
  }

  function addRow() {
    setRows((current) => [...current, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleSubmit() {
    const next: typeof errors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      next.name = "Version name is required.";
    } else {
      const error = validateClearanceText(
        trimmedName,
        "name",
        PEOPLE_TEXT_LIMITS.CLEARANCE_TEMPLATE_NAME,
      );
      if (error) next.name = error;
    }

    const cleaned = rows.map((row) => ({
      employeeId: row.employeeId,
      purpose: row.purpose.trim(),
      requirements: row.requirements.trim(),
    }));

    const incomplete = cleaned.some(
      (row) => !row.employeeId || !row.purpose || !row.requirements,
    );
    const employeeIds = cleaned.map((row) => row.employeeId).filter(Boolean);
    const hasDuplicate = new Set(employeeIds).size !== employeeIds.length;
    const nextRowErrors: Record<string, RowErrors> = {};

    rows.forEach((row) => {
      const rowError: RowErrors = {};
      if (!row.employeeId) rowError.employeeId = "Select a signatory employee.";
      if (!row.purpose.trim()) {
        rowError.purpose = "Purpose is required.";
      } else {
        rowError.purpose = validateClearanceText(
          row.purpose.trim(),
          "purpose",
          PEOPLE_TEXT_LIMITS.CLEARANCE_PURPOSE,
        );
      }
      if (!row.requirements.trim()) {
        rowError.requirements = "Requirements are required.";
      } else {
        rowError.requirements = validateClearanceText(
          row.requirements.trim(),
          "requirements",
          PEOPLE_TEXT_LIMITS.CLEARANCE_REQUIREMENTS,
        );
      }
      if (Object.values(rowError).some(Boolean)) nextRowErrors[row.key] = rowError;
    });

    if (cleaned.length === 0 || incomplete) {
      next.signatories = "Every signatory needs an employee, a purpose, and requirements.";
    } else if (hasDuplicate) {
      next.signatories = "Each employee can only appear once.";
    } else {
      const hasUnsafeText = Object.values(nextRowErrors).some((row) => row.purpose || row.requirements);
      if (hasUnsafeText) next.signatories = "Please review the highlighted signatory fields.";
    }

    setErrors(next);
    setRowErrors(nextRowErrors);
    if (Object.keys(next).length > 0 || Object.keys(nextRowErrors).length > 0) return;

    onSubmit({ name: trimmedName, isDefault, signatories: cleaned });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit clearance version" : "New clearance version"}</DialogTitle>
          <DialogDescription>
            Define the signatories who must sign off, and what each one clears. Editing a version
            does not change clearances already in progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <FormField label="Version name" htmlFor="cv-name" required error={errors.name}>
            <Input
              id="cv-name"
              value={name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="e.g. Standard Clearance"
              maxLength={PEOPLE_TEXT_LIMITS.CLEARANCE_TEMPLATE_NAME}
            />
          </FormField>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[color:var(--text-primary)]">Signatories</p>
              <Button type="button" size="sm" variant="outline" onClick={addRow}>
                <Plus className="h-3.5 w-3.5" />
                Add signatory
              </Button>
            </div>
            {errors.signatories ? (
              <p className="mb-2 text-xs text-[color:var(--color-error-700)]">{errors.signatories}</p>
            ) : null}

            <ol className="space-y-3">
              {rows.map((row, index) => (
                <li
                  key={row.key}
                  className="rounded-lg border border-[color:var(--border-primary)] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                      Signatory {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="destructive-ghost"
                      size="icon-sm"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label={`Remove signatory ${index + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <FormField label="Employee" error={rowErrors[row.key]?.employeeId}>
                      <Combobox
                        options={employeeOptions}
                        value={row.employeeId}
                        onChange={(v) => updateRow(row.key, { employeeId: v })}
                        placeholder={employeesLoading ? "Loading employees…" : "Select an employee…"}
                        searchPlaceholder="Search employees…"
                        emptyText="No employees available."
                      />
                    </FormField>
                    <FormField label="Purpose" error={rowErrors[row.key]?.purpose}>
                      <Textarea
                        value={row.purpose}
                        onChange={(e) => updateRow(row.key, { purpose: e.target.value })}
                        placeholder="What does this signatory clear?"
                        rows={2}
                        maxLength={PEOPLE_TEXT_LIMITS.CLEARANCE_PURPOSE}
                      />
                    </FormField>
                    <FormField label="Requirements" error={rowErrors[row.key]?.requirements}>
                      <Textarea
                        value={row.requirements}
                        onChange={(e) => updateRow(row.key, { requirements: e.target.value })}
                        placeholder="What must they verify before signing?"
                        rows={2}
                        maxLength={PEOPLE_TEXT_LIMITS.CLEARANCE_REQUIREMENTS}
                      />
                    </FormField>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {!isEdit ? (
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              Use this as the default version for new offboarding cases
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
