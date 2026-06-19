"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  useConfirm,
} from "@/shared/ui";
import { useTeamMutations } from "../hooks/use-team-mutations";
import type { Team, TeamEmployee } from "../types/teams.types";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

interface TeamDetailsModalProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** HR/Admin may rename the team and add/remove members. */
  canManage: boolean;
  /** Active employees available to add to the team. */
  employees: EmployeeListItem[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/**
 * Team detail modal: shows the team name and members, and (for HR/Admin) lets the user
 * rename the team and add or remove members. Reads the team from the parent's refreshed
 * list so the member list updates after each mutation.
 */
export function TeamDetailsModal({
  team,
  open,
  onOpenChange,
  canManage,
  employees,
}: TeamDetailsModalProps) {
  const { rename, renaming, addMembers, addingMembers, removeMember } = useTeamMutations();
  const confirm = useConfirm();

  const [renameMode, setRenameMode] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [addDraft, setAddDraft] = useState<Set<string>>(new Set());

  // Reset transient edit state whenever the modal opens or switches teams.
  useEffect(() => {
    setRenameMode(false);
    setRenameDraft(team?.name ?? "");
    setAddMode(false);
    setAddDraft(new Set());
  }, [team?.id, open]);

  // Employees not already on the team. The lead is always part of the team, so exclude
  // them explicitly even if the members array doesn't list them.
  const addableEmployees = useMemo(() => {
    if (!team) return [];
    const present = new Set(team.members.map((member) => member.id));
    present.add(team.leader.id);
    return employees.filter((employee) => !present.has(employee.id));
  }, [team, employees]);

  if (!team) return null;

  // The lead is highlighted separately, so the members list shows everyone else.
  const otherMembers = team.members.filter((member) => member.id !== team.leader.id);

  async function saveRename() {
    if (!team) return;
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === team.name) {
      setRenameMode(false);
      return;
    }
    try {
      await rename({ teamId: team.id, name: trimmed });
      toast.success("Team renamed.");
      setRenameMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename the team.");
    }
  }

  async function saveAddMembers() {
    if (!team || addDraft.size === 0) {
      setAddMode(false);
      return;
    }
    try {
      await addMembers({ teamId: team.id, memberIds: Array.from(addDraft) });
      toast.success(addDraft.size === 1 ? "Member added." : "Members added.");
      setAddMode(false);
      setAddDraft(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add members.");
    }
  }

  async function handleRemoveMember(member: TeamEmployee) {
    if (!team) return;
    // onConfirm keeps the dialog open with a button loader until the removal resolves.
    await confirm({
      title: "Remove member?",
      description: `Remove ${member.fullName} from ${team.name}? They can be added back later.`,
      confirmLabel: "Remove",
      confirmLoadingLabel: "Removing…",
      cancelLabel: "Cancel",
      destructive: true,
      onConfirm: async () => {
        try {
          await removeMember({ teamId: team.id, employeeId: member.id });
          toast.success(`${member.fullName} removed.`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not remove the member.");
          throw err; // keep the dialog open so the user can retry
        }
      },
    });
  }

  function toggleAdd(id: string) {
    setAddDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-pop max-h-[88vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogDescription className="sr-only">
          Team members and management actions for {team.name}.
        </DialogDescription>

        {/* Team name + rename */}
        {renameMode ? (
          <div className="flex items-center gap-2">
            <Input
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              aria-label="Team name"
              autoFocus
            />
            <Button size="sm" onClick={() => void saveRename()} disabled={renaming}>
              <Check aria-hidden="true" /> {renaming ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setRenameMode(false)}
              disabled={renaming}
            >
              <X aria-hidden="true" /> Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="truncate text-lg font-bold text-[color:var(--text-primary)]">
              {team.name}
            </DialogTitle>
            {canManage && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setRenameDraft(team.name);
                  setRenameMode(true);
                }}
              >
                <Pencil aria-hidden="true" /> Rename
              </Button>
            )}
          </div>
        )}

        {/* Team lead */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Team lead
          </p>
          <div className="flex items-center gap-2">
            <Avatar name={team.leader.fullName} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                {team.leader.fullName}
              </span>
              <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                {team.leader.jobTitle ?? team.leader.companyEmail}
              </span>
            </span>
          </div>
        </div>

        {/* Members (excludes the lead, shown above) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Members ({otherMembers.length})
            </p>
            {canManage && !addMode && (
              <Button size="xs" variant="ghost" onClick={() => setAddMode(true)}>
                <UserPlus aria-hidden="true" /> Add members
              </Button>
            )}
          </div>

          {otherMembers.length === 0 ? (
            <p className="text-xs text-[color:var(--text-tertiary)]">No additional members yet.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--border-primary)]">
              {otherMembers.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={member.fullName} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                        {member.fullName}
                      </span>
                      <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                        {member.jobTitle ?? member.companyEmail}
                      </span>
                    </span>
                  </span>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => void handleRemoveMember(member)}
                      aria-label={`Remove ${member.fullName} from ${team.name}`}
                    >
                      <UserMinus aria-hidden="true" /> Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add members panel */}
        {canManage && addMode && (
          <div className="rounded-lg border border-[color:var(--border-primary)] p-3">
            <Command className="rounded-lg border border-[color:var(--border-primary)]">
              <CommandInput placeholder="Search employees…" />
              <CommandList className="max-h-48">
                <CommandEmpty>No employees available to add.</CommandEmpty>
                <CommandGroup>
                  {addableEmployees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.fullName} ${employee.jobTitle ?? ""}`}
                      onSelect={() => toggleAdd(employee.id)}
                      className="gap-2"
                    >
                      <Checkbox
                        checked={addDraft.has(employee.id)}
                        aria-hidden="true"
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                          {employee.fullName}
                        </span>
                        {employee.jobTitle && (
                          <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                            {employee.jobTitle}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <div className="mt-3 flex justify-end gap-2 py-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAddMode(false);
                  setAddDraft(new Set());
                }}
                disabled={addingMembers}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void saveAddMembers()}
                disabled={addingMembers || addDraft.size === 0}
              >
                {addingMembers ? "Adding…" : `Add ${addDraft.size > 0 ? addDraft.size : ""}`.trim()}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
