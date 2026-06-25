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
  UserAvatar,
} from "@/shared/ui";
import { ApiError } from "@/shared/lib/api-client";
import {
  PEOPLE_TEXT_LIMITS,
  validatePeopleFieldText,
  mapPeopleFieldTextError,
} from "@/modules/people/people-text";
import { useCreateTeam } from "../hooks/use-create-team";
import {
  EMPLOYEE_AVATAR_FALLBACK_STYLE,
  employeeInitials,
  toEmployeeOption,
} from "@/modules/people/employees/employee-options";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

const TEAM_NAME_INVALID_MESSAGE =
  "Please enter a valid team name using letters, numbers, spaces, and common punctuation only.";

/**
 * Whether an employee may sit under a manager given the same-department rule. Mirrors the
 * backend: a null department on either side is exempt, so they pair with anyone.
 */
function sameDepartment(a: string | null, b: string | null): boolean {
  return !a || !b || a === b;
}

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

  const leaderOptions = useMemo(() => employees.map(toEmployeeOption), [employees]);

  const leader = useMemo(
    () => employees.find((e) => e.id === leaderId) ?? null,
    [employees, leaderId],
  );

  // Members must share the leader's department (null department = exempt). Until a leader is
  // chosen, everyone is selectable.
  const memberCandidates = useMemo(
    () =>
      employees.filter(
        (e) => e.id !== leaderId && (!leader || sameDepartment(e.department, leader.department)),
      ),
    [employees, leaderId, leader],
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

  function validateTeamName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Team name is required.";
    const textError = mapPeopleFieldTextError(
      validatePeopleFieldText(trimmed, "Team name", PEOPLE_TEXT_LIMITS.TEAM_NAME),
      TEAM_NAME_INVALID_MESSAGE,
    );
    if (textError) return textError;
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return "A team with this name already exists.";
    }
    return null;
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    const nameError = validateTeamName(name);
    if (nameError) {
      setError(nameError);
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
      if (err instanceof ApiError) {
        const fieldMessage =
          err.fieldErrors.find((fieldError) => fieldError.field === "team")?.message ??
          err.fieldErrors[0]?.message;
        setError(fieldMessage ?? err.message);
        return;
      }
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
                const nextName = e.target.value;
                setName(nextName);
                setError(validateTeamName(nextName));
              }}
              placeholder="e.g. Customer success"
              autoFocus
              maxLength={PEOPLE_TEXT_LIMITS.TEAM_NAME}
            />
          </FormField>

          <FormField label="Team leader" required>
            <Combobox
              options={leaderOptions}
              value={leaderId}
              onChange={(v) => {
                setLeaderId(v);
                setError(null);
                // Drop any already-picked members who fall outside the new leader's department.
                const nextLeader = employees.find((e) => e.id === v) ?? null;
                setMemberIds((prev) => {
                  const next = new Set<string>();
                  for (const id of prev) {
                    const member = employees.find((e) => e.id === id);
                    if (member && (!nextLeader || sameDepartment(member.department, nextLeader.department))) {
                      next.add(id);
                    }
                  }
                  return next;
                });
              }}
              placeholder="Select a leader…"
              searchPlaceholder="Search employees…"
              emptyText="No employees found."
            />
          </FormField>

          {leaderId ? (
          <FormField
            label="Members"
            hint={
              leader?.department
                ? `Optional — only ${leader.department} members can join this team.`
                : "Optional — add now or later."
            }
          >
            <Command className="rounded-lg border border-[color:var(--border-primary)]">
              <CommandInput placeholder="Search employees…" />
              <CommandList className="max-h-48">
                <CommandEmpty>No employees found.</CommandEmpty>
                <CommandGroup>
                  {memberCandidates.map((e) => (
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
                        <UserAvatar
                          src={e.avatarUrl}
                          fallback={employeeInitials(e.fullName)}
                          className="h-7 w-7 shrink-0"
                          fallbackClassName="text-[11px] font-semibold text-[color:var(--text-primary)]"
                          fallbackStyle={EMPLOYEE_AVATAR_FALLBACK_STYLE}
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
          ) : (
            <FormField label="Members">
              <p className="text-xs text-[color:var(--text-tertiary)]">
                Select a team leader first to add members.
              </p>
            </FormField>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving} loading={saving}>
            {saving ? "Creating…" : "Create team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
