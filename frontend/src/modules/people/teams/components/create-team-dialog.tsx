"use client";

import { useState } from "react";
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
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { DemoEmployee, Team } from "@/shared/mock/types";

const NO_LEAD = "__none__";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  employees: DemoEmployee[];
  /** Called after a new team is persisted. */
  onCreated: () => void;
}

export function CreateTeamDialog({ open, onOpenChange, teams, employees, onCreated }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>(NO_LEAD);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setParentId("");
    setLeadId(NO_LEAD);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Team name is required.");
      return;
    }
    if (teams.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("A team with this name already exists.");
      return;
    }

    const id = `t-${Date.now().toString(36)}`;
    const newTeam: Team = {
      id,
      name: trimmed,
      parentId: parentId || null,
      leadEmployeeId: leadId === NO_LEAD ? null : leadId,
      memberIds: [],
    };

    const current = readCollection<Team>("teams");
    writeCollection<Team>("teams", [...current, newTeam]);
    toast.success(`Team "${trimmed}" created.`);
    reset();
    onOpenChange(false);
    onCreated();
  }

  const leadOptions = employees.map((e) => ({ value: e.employeeId, label: `${e.displayName} · ${e.jobTitle}` }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>Add a team to the org structure. You can assign members later.</DialogDescription>
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

          <FormField label="Reports to" htmlFor="team-parent" hint="Optional — leave empty for a top-level team.">
            <Select value={parentId || NO_LEAD} onValueChange={(v) => setParentId(v === NO_LEAD ? "" : v)}>
              <SelectTrigger id="team-parent">
                <SelectValue placeholder="No parent (top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LEAD}>No parent (top level)</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Team lead" hint="Optional — assign now or later.">
            <Combobox
              options={leadOptions}
              value={leadId === NO_LEAD ? "" : leadId}
              onChange={(v) => setLeadId(v || NO_LEAD)}
              placeholder="Select a lead…"
              searchPlaceholder="Search employees…"
              emptyText="No employees found."
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create team</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
