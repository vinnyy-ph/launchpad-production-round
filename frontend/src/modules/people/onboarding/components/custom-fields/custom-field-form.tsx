"use client";

import { Checkbox, FormField, Input } from "@/shared/ui";
import { PEOPLE_TEXT_LIMITS } from "@/modules/people/people-text";

export function CustomFieldForm({
  fieldLabel,
  isRequired,
  onFieldLabelChange,
  onIsRequiredChange,
  errors,
}: {
  fieldLabel: string;
  isRequired: boolean;
  onFieldLabelChange: (value: string) => void;
  onIsRequiredChange: (value: boolean) => void;
  errors?: { fieldLabel?: string };
}) {
  return (
    <div className="space-y-4">
      <FormField label="Field label" htmlFor="custom-field-label" required error={errors?.fieldLabel}>
        <Input
          id="custom-field-label"
          value={fieldLabel}
          onChange={(e) => onFieldLabelChange(e.target.value)}
          placeholder="e.g. SSS Number"
          maxLength={PEOPLE_TEXT_LIMITS.CUSTOM_FIELD_LABEL}
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
        <Checkbox checked={isRequired} onCheckedChange={(checked) => onIsRequiredChange(checked === true)} />
        Required for onboarding completion
      </label>
    </div>
  );
}
