"use client";

import { Pencil, Plus, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import type { OnboardingCustomFieldConfig } from "../../types/onboarding.types";

export function CustomFieldBuilder({
  fields,
  onAdd,
  onEdit,
  onDelete,
  deletingId,
}: {
  fields: OnboardingCustomFieldConfig[];
  onAdd: () => void;
  onEdit: (field: OnboardingCustomFieldConfig) => void;
  onDelete: (field: OnboardingCustomFieldConfig) => void;
  deletingId?: string | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Custom fields</h2>
          <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
            Extra questions new hires answer during onboarding.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={ListChecks}
            title="No custom fields yet"
            body="Add fields like SSS Number or shirt size for new hires to complete."
            action={{ label: "Add field", onClick: onAdd }}
          />
        </div>
      ) : (
        <div className="divide-y divide-[color:var(--border-primary)] border-t border-[color:var(--border-primary)]">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  {field.fieldLabel}
                </p>
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  {field.isRequired ? "Required" : "Optional"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(field)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2]"
                  onClick={() => onDelete(field)}
                  disabled={deletingId === field.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
