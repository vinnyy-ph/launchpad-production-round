"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Combobox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
} from "@/shared/ui";
import { useCreateTeam } from "../hooks/use-create-team";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active employees available to lead or join the team. */
  employees: EmployeeListItem[];
  existingNames: string[];
  /** Called after a new team is persisted. */
  onCreated: () => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  employees,
  existingNames,
  onCreated,
}: CreateTeamDialogProps) {
  const { create, saving } = useCreateTeam();
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const leaderOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: e.jobTitle ? `${e.fullName} · ${e.jobTitle}` : e.fullName,
      })),
    [employees],
  );

  function reset() {
    setName("");
    setLeaderId("");
    setMemberIds(new Set());
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Team name is required.");
      return;
    }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError("A team with this name already exists.");
      return;
    }
    if (!leaderId) {
      setError("A team leader is required.");
      return;
    }

    try {
      // The leader is added as a member automatically by the backend; drop them
      // from the explicit member list to avoid a redundant id.
      const members = Array.from(memberIds).filter((id) => id !== leaderId);
      await create({ name: trimmed, leaderId, memberIds: members });
      toast.success(`Team "${trimmed}" created.`);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the team.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Name the team, pick a leader, and add members. The leader joins the team automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Team name" htmlFor="team-name" required error={error ?? undefined}>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Customer success"
              autoFocus
            />
          </FormField>

          <FormField label="Team leader" required>
            <Combobox
              options={leaderOptions}
              value={leaderId}
              onChange={(v) => {
                setLeaderId(v);
                setError(null);
              }}
              placeholder="Select a leader…"
              searchPlaceholder="Search employees…"
              emptyText="No employees found."
            />
          </FormField>

          <FormField label="Members" hint="Optional — add now or later.">
            <Command className="rounded-lg border border-[color:var(--border-primary)]">
              <CommandInput placeholder="Search employees…" />
              <CommandList className="max-h-48">
                <CommandEmpty>No employees found.</CommandEmpty>
                <CommandGroup>
                  {employees
                    .filter((e) => e.id !== leaderId)
                    .map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.fullName} ${e.jobTitle ?? ""}`}
                        onSelect={() => toggleMember(e.id)}
                        className="gap-2"
                      >
                        <Checkbox
                          checked={memberIds.has(e.id)}
                          aria-hidden="true"
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                            {e.fullName}
                          </span>
                          {e.jobTitle && (
                            <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                              {e.jobTitle}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Creating…" : "Create team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
