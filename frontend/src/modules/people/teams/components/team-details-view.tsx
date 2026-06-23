"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
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
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  UserAvatar,
  useConfirm,
} from "@/shared/ui";
import { EmptyState, ErrorState } from "@/shared/ui/patterns";
import { RedactedProfileSheet } from "@/modules/people/employees/components/redacted-profile-sheet";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useTeamMutations } from "../hooks/use-team-mutations";
import type { Team, TeamEmployee } from "../types/teams.types";

interface TeamDetailsViewProps {
  team: Team | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Whether the viewer may rename the team (HR/Admin only). */
  canRename: boolean;
  /** Whether the viewer may add/remove members (HR/Admin, or the team's own leader). */
  canManageMembers: boolean;
  /** Where the back button returns to, and its label. */
  backHref: string;
  backLabel: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <UserAvatar
      src={src}
      fallback={initials(name)}
      className="h-9 w-9"
      fallbackClassName="text-[11px] font-bold text-white"
      fallbackStyle={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
    />
  );
}

/** A clickable person row that opens the redacted profile drawer. */
function PersonRow({
  person,
  caption,
  onOpen,
}: {
  person: TeamEmployee;
  caption?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${person.fullName}'s profile`}
      className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[color:var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar name={person.fullName} src={person.avatarUrl} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
          {person.fullName}
        </span>
        <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
          {caption ?? person.jobTitle ?? person.companyEmail}
        </span>
      </span>
    </button>
  );
}

/**
 * Add-members modal. Mounted only while adding, so the employee directory is fetched lazily.
 * Excludes people already on the team (the leader is always a member). On a successful add the
 * teams query is invalidated by the mutation, so the parent's team data refreshes automatically.
 */
function AddMembersDialog({
  team,
  open,
  onOpenChange,
}: {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { employees, loading } = useEmployees({ status: "active", limit: 100 });
  const { addMembers, addingMembers } = useTeamMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const addableEmployees = useMemo(() => {
    const present = new Set(team.members.map((member) => member.id));
    present.add(team.leader.id);
    return employees.filter((employee) => !present.has(employee.id));
  }, [team, employees]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await addMembers({ teamId: team.id, memberIds: Array.from(selected) });
      toast.success(selected.size === 1 ? "Member added." : "Members added.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add members.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-pop grid max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogDescription className="sr-only">
          Add members to {team.name}.
        </DialogDescription>

        <header className="border-b border-[color:var(--border-primary)] px-6 py-4 pr-12">
          <DialogTitle className="text-lg font-bold text-[color:var(--text-primary)]">
            Add members
          </DialogTitle>
        </header>

        <div className="overflow-y-auto px-6 py-4">
          <Command className="rounded-lg border border-[color:var(--border-primary)]">
            <CommandInput placeholder="Search employees…" />
            <CommandList className="max-h-72">
              <CommandEmpty>
                {loading ? "Loading employees…" : "No employees available to add."}
              </CommandEmpty>
              <CommandGroup>
                {addableEmployees.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={`${employee.fullName} ${employee.jobTitle ?? ""}`}
                    onSelect={() => toggle(employee.id)}
                    className="gap-2"
                  >
                    <Checkbox
                      checked={selected.has(employee.id)}
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
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--border-primary)] px-6 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={addingMembers}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={addingMembers || selected.size === 0}>
            {addingMembers ? "Adding…" : `Add ${selected.size > 0 ? selected.size : ""}`.trim()}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shared team detail page: shows the team name, its leader, and all members, with each person
 * clickable to open their redacted profile. Management actions are gated by the viewer's rights:
 * HR/Admin may rename the team (`canRename`); HR/Admin and the team's own leader may add and remove
 * members (`canManageMembers`). Reads `team` from the parent's query, so it reflects each mutation
 * once the teams cache is invalidated.
 */
export function TeamDetailsView({
  team,
  loading,
  error,
  onRetry,
  canRename,
  canManageMembers,
  backHref,
  backLabel,
}: TeamDetailsViewProps) {
  const router = useRouter();
  const { rename, renaming, removeMember } = useTeamMutations();
  const confirm = useConfirm();

  const [renameMode, setRenameMode] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Reset transient edit state whenever the loaded team changes.
  useEffect(() => {
    setRenameMode(false);
    setRenameDraft(team?.name ?? "");
    setAddMode(false);
  }, [team?.id]);

  // The leader is always part of the team; the members section lists everyone else.
  const otherMembers = useMemo(
    () => (team ? team.members.filter((member) => member.id !== team.leader.id) : []),
    [team],
  );

  const backButton = (
    <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      {backLabel}
    </Button>
  );

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

  if (loading) {
    return (
      <div className="space-y-4">
        {backButton}
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {backButton}
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState
          icon={Users}
          title="Team not found"
          body="This team doesn't exist or you don't have access to it."
          action={{ label: `Back to ${backLabel.toLowerCase()}`, onClick: () => router.push(backHref) }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: team name (or rename) + member count + back */}
      <div className="flex items-center justify-between gap-3">
        {renameMode ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              aria-label="Team name"
              autoFocus
              className="max-w-xs"
            />
            <Button size="sm" onClick={() => void saveRename()} disabled={renaming}>
              <Check aria-hidden="true" /> {renaming ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRenameMode(false)} disabled={renaming}>
              <X aria-hidden="true" /> Cancel
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[color:var(--bg-secondary)]"
              aria-hidden="true"
            >
              <Users size={20} className="text-[color:var(--text-secondary)]" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-[color:var(--text-primary)]">
                {team.name}
              </h1>
              <p className="text-sm text-[color:var(--text-tertiary)]">
                {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
            {canRename && (
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
        {!renameMode && backButton}
      </div>

      {/* Team leader */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Team lead
        </p>
        <PersonRow
          person={team.leader}
          caption={team.leader.jobTitle ?? team.leader.companyEmail}
          onOpen={() => setProfileId(team.leader.id)}
        />
      </div>

      {/* Team members (excludes the leader, shown above) — a card grid, not a flat list. */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Team members ({otherMembers.length})
          </p>
          {canManageMembers && (
            <Button size="sm" onClick={() => setAddMode(true)}>
              <Plus aria-hidden="true" /> Add members
            </Button>
          )}
        </div>

        {otherMembers.length === 0 ? (
          <div
            className="rounded-2xl border border-[color:var(--border-primary)] bg-white px-6 py-8 text-center text-sm text-[color:var(--text-tertiary)]"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            No additional members yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-1 rounded-2xl border border-[color:var(--border-primary)] bg-white pr-1.5 transition-colors hover:border-[color:var(--border-secondary)]"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <div className="min-w-0 flex-1">
                  <PersonRow person={member} onOpen={() => setProfileId(member.id)} />
                </div>
                {canManageMembers && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="flex-shrink-0 text-[#D92D20] hover:bg-[#FEF3F2] hover:text-[#D92D20]"
                          onClick={() => void handleRemoveMember(member)}
                          aria-label="Remove Member"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Remove Member</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add members modal (mounted only while adding, so the directory is fetched lazily) */}
      {canManageMembers && addMode && (
        <AddMembersDialog team={team} open={addMode} onOpenChange={setAddMode} />
      )}

      <RedactedProfileSheet
        employeeId={profileId}
        open={Boolean(profileId)}
        onOpenChange={(open) => {
          if (!open) setProfileId(null);
        }}
      />
    </div>
  );
}
