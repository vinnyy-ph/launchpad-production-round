"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
} from "@/shared/ui";
import { ApiError } from "@/shared/lib/api-client";
import { useDepartmentMutations } from "../hooks/use-department-mutations";
import type { DepartmentListItem } from "../types/departments.types";

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this department; otherwise it creates a new one. */
  department?: DepartmentListItem | null;
  /** Called after a successful create or rename. */
  onSaved: () => void;
}

/** Add/edit dialog for a department. A single name field drives both create and rename. */
export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  onSaved,
}: DepartmentFormDialogProps) {
  const { create, creating, update, updating } = useDepartmentMutations();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(department);
  const saving = creating || updating;

  // Seed the field from the department being edited whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setName(department?.name ?? "");
      setError(null);
    }
  }, [open, department]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Department name is required.");
      return;
    }
    if (isEdit && trimmed === department!.name) {
      onOpenChange(false);
      return;
    }

    try {
      if (isEdit) {
        await update({ id: department!.id, input: { name: trimmed } });
        toast.success(`Department renamed to "${trimmed}".`);
      } else {
        await create({ name: trimmed });
        toast.success(`Department "${trimmed}" created.`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      // Surface a duplicate-name conflict on the field; fall back to a generic message.
      if (err instanceof ApiError && err.errorCode === "DEPARTMENT_ALREADY_EXISTS") {
        setError("A department with this name already exists.");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Could not save the department.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rename department" : "Add department"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the department name. Employees stay assigned to it."
              : "Create a department employees can be assigned to."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField
            label="Department name"
            htmlFor="department-name"
            required
            error={error ?? undefined}
          >
            <Input
              id="department-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="e.g. Engineering"
              autoFocus
              maxLength={100}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Add department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
