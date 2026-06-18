"use client";

import { useMemo, useState } from "react";
import { Network, Plus, UserCog, UserMinus, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Badge,
  Button,
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
  Skeleton,
  EmptyState,
  ErrorState,
  StatCard,
  useConfirm,
} from "@/shared/ui";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import { useTeamMutations } from "@/modules/people/teams/hooks/use-team-mutations";
import { CreateTeamDialog } from "@/modules/people/teams/components/create-team-dialog";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type { Team, TeamEmployee } from "@/modules/people/teams/types/teams.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 7 }: { name: string; size?: 7 | 9 }) {
  const dim = size === 9 ? "h-9 w-9 text-[11px]" : "h-7 w-7 text-[10px]";
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${dim}`}
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export default function TeamsPage() {
  const { appUser } = useAuth();
  const canManage = appUser?.role === "ADMIN" || appUser?.role === "HR";

  const { teams, loading, error, reload } = useTeams();
  const { employees } = useEmployees({ status: "active", limit: 100 });
  const { rename, renaming, addMembers, addingMembers, removeMember } = useTeamMutations();
  const confirm = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTeam, setRenameTeam] = useState<Team | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [addTeam, setAddTeam] = useState<Team | null>(null);
  const [addDraft, setAddDraft] = useState<Set<string>>(new Set());

  const totalMembers = useMemo(
    () => teams.reduce((sum, t) => sum + t.memberCount, 0),
    [teams],
  );
  const existingNames = useMemo(() => teams.map((t) => t.name), [teams]);

  function openRename(team: Team) {
    setRenameTeam(team);
    setRenameDraft(team.name);
  }

  async function saveRename() {
    if (!renameTeam) return;
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === renameTeam.name) {
      setRenameTeam(null);
      return;
    }
    try {
      await rename({ teamId: renameTeam.id, name: trimmed });
      toast.success("Team renamed.");
      setRenameTeam(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename the team.");
    }
  }

  function openAddMembers(team: Team) {
    setAddTeam(team);
    setAddDraft(new Set());
  }

  async function saveAddMembers() {
    if (!addTeam || addDraft.size === 0) {
      setAddTeam(null);
      return;
    }
    try {
      await addMembers({ teamId: addTeam.id, memberIds: Array.from(addDraft) });
      toast.success(addDraft.size === 1 ? "Member added." : "Members added.");
      setAddTeam(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add members.");
    }
  }

  async function handleRemoveMember(team: Team, member: TeamEmployee) {
    const ok = await confirm({
      title: "Remove member?",
      description: `Remove ${member.fullName} from ${team.name}? They can be added back later.`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeMember({ teamId: team.id, employeeId: member.id });
      toast.success(`${member.fullName} removed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the member.");
    }
  }

  // Employees not already on the team being edited (leader + members excluded).
  const addableEmployees = useMemo(() => {
    if (!addTeam) return employees;
    const present = new Set(addTeam.members.map((m) => m.id));
    return employees.filter((e) => !present.has(e.id));
  }, [addTeam, employees]);

  return (
    <div className="relative">
      {/* Gradient blur accent — page header area only */}
      <div className="pointer-events-none absolute left-0 top-0 h-48 w-full overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-10 -top-10 h-64 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-blue, #93c5fd))" }}
        />
      </div>

      <div className="relative">
        <PageHeader
          level="page"
          title="Teams"
          subtitle="Organizational structure and team membership."
          action={
            canManage && !loading && !error && teams.length > 0 ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden="true" />
                Create team
              </Button>
            ) : undefined
          }
        />

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <StatCard label="Total teams" value={loading ? "—" : teams.length} />
          <StatCard label="Team members" value={loading ? "—" : totalMembers} />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6">
            <ErrorState message={error} onRetry={() => void reload()} />
          </div>
        )}

        {/* Teams list */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : !error && teams.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No teams configured"
            body={
              canManage
                ? "Create your first team to start building the org structure."
                : "Teams will appear here once HR sets up the org structure."
            }
            action={
              canManage ? { label: "Create team", onClick: () => setCreateOpen(true) } : undefined
            }
          />
        ) : !error ? (
          <div className="space-y-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                canManage={canManage}
                onRename={() => openRename(team)}
                onAddMembers={() => openAddMembers(team)}
                onRemoveMember={(member) => void handleRemoveMember(team, member)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Create team dialog */}
      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        existingNames={existingNames}
        onCreated={() => void reload()}
      />

      {/* Rename dialog */}
      <Dialog open={renameTeam !== null} onOpenChange={(o) => { if (!o) setRenameTeam(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename team</DialogTitle>
            <DialogDescription>{renameTeam ? `Update the name for ${renameTeam.name}.` : ""}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Team name" htmlFor="rename-team">
              <Input
                id="rename-team"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                autoFocus
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRenameTeam(null)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={() => void saveRename()} disabled={renaming}>
              {renaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add members dialog */}
      <Dialog open={addTeam !== null} onOpenChange={(o) => { if (!o) setAddTeam(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              {addTeam ? `Add employees to ${addTeam.name}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Command className="rounded-lg border border-[color:var(--border-primary)]">
              <CommandInput placeholder="Search employees…" />
              <CommandList className="max-h-56">
                <CommandEmpty>No employees available to add.</CommandEmpty>
                <CommandGroup>
                  {addableEmployees.map((e) => (
                    <CommandItem
                      key={e.id}
                      value={`${e.fullName} ${e.jobTitle ?? ""}`}
                      onSelect={() =>
                        setAddDraft((prev) => {
                          const next = new Set(prev);
                          if (next.has(e.id)) next.delete(e.id);
                          else next.add(e.id);
                          return next;
                        })
                      }
                      className="gap-2"
                    >
                      <Checkbox
                        checked={addDraft.has(e.id)}
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
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddTeam(null)} disabled={addingMembers}>
              Cancel
            </Button>
            <Button onClick={() => void saveAddMembers()} disabled={addingMembers || addDraft.size === 0}>
              {addingMembers ? "Adding…" : `Add ${addDraft.size > 0 ? addDraft.size : ""}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── team card ────────────────────────────────────────────────────────────────

interface TeamCardProps {
  team: Team;
  canManage: boolean;
  onRename: () => void;
  onAddMembers: () => void;
  onRemoveMember: (member: TeamEmployee) => void;
}

function TeamCard({ team, canManage, onRename, onAddMembers, onRemoveMember }: TeamCardProps) {
  // The leader is included in members; list the rest separately under the leader.
  const otherMembers = team.members.filter((m) => m.id !== team.leader.id);

  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-bold text-[color:var(--text-primary)]">{team.name}</p>
          <Badge variant="neutral">{team.memberCount} members</Badge>
        </div>
        {canManage && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <Button variant="ghost" size="xs" onClick={onRename} aria-label={`Rename ${team.name}`}>
              <Pencil aria-hidden="true" />
              Rename
            </Button>
            <Button variant="ghost" size="xs" onClick={onAddMembers} aria-label={`Add members to ${team.name}`}>
              <UserPlus aria-hidden="true" />
              Add members
            </Button>
          </div>
        )}
      </div>

      {/* Leader */}
      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Team lead
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar name={team.leader.fullName} size={9} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
              {team.leader.fullName}
            </span>
            <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
              {team.leader.jobTitle ?? team.leader.companyEmail}
            </span>
          </span>
          <span className="ml-1 inline-flex flex-shrink-0 items-center gap-1 text-[color:var(--text-tertiary)]">
            <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Members
        </p>
        {otherMembers.length === 0 ? (
          <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">No additional members yet.</p>
        ) : (
          <div className="mt-1.5 divide-y divide-[color:var(--border-primary)]">
            {otherMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 py-2">
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
                    onClick={() => onRemoveMember(member)}
                    aria-label={`Remove ${member.fullName} from ${team.name}`}
                  >
                    <UserMinus aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
