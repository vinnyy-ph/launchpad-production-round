"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Network } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusBadge,
  EmptyState,
  ErrorState,
  StatCard,
} from "@/shared/ui";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { Team, DemoEmployee } from "@/shared/mock/types";
import { OrgChart, allTeamIds } from "@/modules/people/employees/components/org-chart/org-chart";
import { OrgChartControls } from "@/modules/people/employees/components/org-chart/org-chart-controls";
import { CreateTeamDialog } from "@/modules/people/teams/components/create-team-dialog";

const NONE = "__none__";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // expand/collapse state — teamIds that are open
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // dialogs / sheet
  const [createOpen, setCreateOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [leadTeamId, setLeadTeamId] = useState<string | null>(null);
  const [moveEmployeeId, setMoveEmployeeId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const nextTeams = readCollection<Team>("teams");
      setTeams(nextTeams);
      setEmployees(readCollection<DemoEmployee>("employees"));
      // default: expand the root level on first load
      setExpanded((prev) => (prev.size === 0 ? new Set(nextTeams.filter((t) => t.parentId === null).map((t) => t.id)) : prev));
    } catch {
      setError("Could not load teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, DemoEmployee>();
    for (const e of employees) map.set(e.employeeId, e);
    return map;
  }, [employees]);

  const totalActiveMembers = useMemo(
    () => employees.filter((e) => e.isActive).length,
    [employees],
  );

  // ── expand/collapse ─────────────────────────────────────────────────────────
  const toggle = useCallback((teamId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpanded(new Set(allTeamIds(teams))), [teams]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // ── change team lead ──────────────────────────────────────────────────────
  const leadTeam = leadTeamId ? teams.find((t) => t.id === leadTeamId) ?? null : null;
  const [leadDraft, setLeadDraft] = useState<string>(NONE);
  useEffect(() => {
    setLeadDraft(leadTeam?.leadEmployeeId ?? NONE);
  }, [leadTeam]);

  const saveLead = useCallback(() => {
    if (!leadTeam) return;
    const current = readCollection<Team>("teams");
    const next = current.map((t) =>
      t.id === leadTeam.id ? { ...t, leadEmployeeId: leadDraft === NONE ? null : leadDraft } : t,
    );
    writeCollection<Team>("teams", next);
    toast.success("Team lead updated.");
    setLeadTeamId(null);
    load();
  }, [leadTeam, leadDraft, load]);

  // ── move member to another team ───────────────────────────────────────────
  const moveEmployee = moveEmployeeId ? employeeMap.get(moveEmployeeId) ?? null : null;
  const [moveDraft, setMoveDraft] = useState<string>("");
  useEffect(() => {
    setMoveDraft(moveEmployee?.teamId ?? "");
  }, [moveEmployee]);

  const saveMove = useCallback(() => {
    if (!moveEmployee || !moveDraft || moveDraft === moveEmployee.teamId) {
      setMoveEmployeeId(null);
      return;
    }
    const fromTeamId = moveEmployee.teamId;
    // 1) update employee's teamId
    const emps = readCollection<DemoEmployee>("employees");
    writeCollection<DemoEmployee>(
      "employees",
      emps.map((e) => (e.employeeId === moveEmployee.employeeId ? { ...e, teamId: moveDraft } : e)),
    );
    // 2) update team membership arrays (remove from old, add to new)
    const current = readCollection<Team>("teams");
    writeCollection<Team>(
      "teams",
      current.map((t) => {
        if (t.id === fromTeamId) return { ...t, memberIds: t.memberIds.filter((id) => id !== moveEmployee.employeeId) };
        if (t.id === moveDraft) return { ...t, memberIds: [...new Set([...t.memberIds, moveEmployee.employeeId])] };
        return t;
      }),
    );
    toast.success(`${moveEmployee.displayName} moved.`);
    setMoveEmployeeId(null);
    load();
  }, [moveEmployee, moveDraft, load]);

  // ── profile sheet ──────────────────────────────────────────────────────────
  const profile = profileId ? employeeMap.get(profileId) ?? null : null;

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.employeeId, label: `${e.displayName} · ${e.jobTitle}` })),
    [employees],
  );
  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams],
  );

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
        />

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <StatCard label="Total teams" value={loading ? "—" : teams.length} />
          <StatCard label="Active members" value={loading ? "—" : totalActiveMembers} />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6">
            <ErrorState message={error} onRetry={load} />
          </div>
        )}

        {/* Org chart */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="ml-6 h-24 rounded-xl" />
            <Skeleton className="ml-6 h-24 rounded-xl" />
          </div>
        ) : !error && teams.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No teams configured"
            body="Create your first team to start building the org structure."
            action={{ label: "Create team", onClick: () => setCreateOpen(true) }}
          />
        ) : !error ? (
          <>
            <OrgChartControls
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onCreateTeam={() => setCreateOpen(true)}
            />
            <OrgChart
              teams={teams}
              employees={employees}
              expanded={expanded}
              onToggle={toggle}
              onOpenProfile={(id) => setProfileId(id)}
              onChangeLead={(id) => setLeadTeamId(id)}
              onMoveMember={(id) => setMoveEmployeeId(id)}
            />
          </>
        ) : null}
      </div>

      {/* Create team dialog */}
      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
        employees={employees}
        onCreated={load}
      />

      {/* Change lead dialog */}
      <Dialog open={leadTeamId !== null} onOpenChange={(o) => { if (!o) setLeadTeamId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change team lead</DialogTitle>
            <DialogDescription>{leadTeam ? `Set the lead for ${leadTeam.name}.` : ""}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Team lead">
              <Combobox
                options={employeeOptions}
                value={leadDraft === NONE ? "" : leadDraft}
                onChange={(v) => setLeadDraft(v || NONE)}
                placeholder="Select a lead…"
                searchPlaceholder="Search employees…"
                emptyText="No employees found."
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLeadTeamId(null)}>Cancel</Button>
            <Button onClick={saveLead}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move member dialog */}
      <Dialog open={moveEmployeeId !== null} onOpenChange={(o) => { if (!o) setMoveEmployeeId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move member</DialogTitle>
            <DialogDescription>
              {moveEmployee ? `Move ${moveEmployee.displayName} to another team.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Team">
              <Combobox
                options={teamOptions}
                value={moveDraft}
                onChange={(v) => setMoveDraft(v)}
                placeholder="Select a team…"
                searchPlaceholder="Search teams…"
                emptyText="No teams found."
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMoveEmployeeId(null)}>Cancel</Button>
            <Button onClick={saveMove} disabled={!moveDraft || moveDraft === moveEmployee?.teamId}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read-only profile sheet */}
      <Sheet open={profileId !== null} onOpenChange={(o) => { if (!o) setProfileId(null); }}>
        <SheetContent>
          {profile && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
                    aria-hidden="true"
                  >
                    {initials(profile.displayName)}
                  </span>
                  <div className="min-w-0 text-left">
                    <SheetTitle>{profile.displayName}</SheetTitle>
                    <SheetDescription>{profile.jobTitle}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <dl className="mt-6 space-y-4 text-sm">
                <ProfileRow label="Email" value={profile.email} />
                <ProfileRow label="Department" value={profile.department} />
                <ProfileRow
                  label="Team"
                  value={(profile.teamId && teams.find((t) => t.id === profile.teamId)?.name) || "—"}
                />
                <ProfileRow
                  label="Supervisor"
                  value={(profile.supervisorId && employeeMap.get(profile.supervisorId)?.displayName) || "—"}
                />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[color:var(--text-tertiary)]">Status</dt>
                  <dd><StatusBadge status={profile.employeeStatus} dot /></dd>
                </div>
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[color:var(--text-tertiary)]">{label}</dt>
      <dd className="truncate font-medium text-[color:var(--text-primary)]">{value}</dd>
    </div>
  );
}
