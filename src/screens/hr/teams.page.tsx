"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Network } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Badge,
  Skeleton,
  StatusBadge,
  EmptyState,
  ErrorState,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  StatCard,
} from "@/shared/ui";
import { readCollection } from "@/shared/mock/db";
import type { Team, DemoEmployee } from "@/shared/mock/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── sub-components ──────────────────────────────────────────────────────────

function LeadAvatar({ name }: { name: string }) {
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

function MemberAvatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

interface TeamCardProps {
  team: Team;
  lead: DemoEmployee | undefined;
  members: DemoEmployee[];
}

function TeamCard({ team, lead, members }: TeamCardProps) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      {/* Team name */}
      <p className="text-base font-bold text-[color:var(--text-primary)]">{team.name}</p>

      {/* Lead row */}
      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Team Lead
        </p>
        {lead ? (
          <div className="mt-1.5 flex items-center gap-2">
            <LeadAvatar name={lead.displayName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                {lead.displayName}
              </p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{lead.jobTitle}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">No lead assigned</p>
        )}
      </div>

      {/* Member count + expandable list */}
      <div className="mt-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="members" className="border-0">
            <AccordionTrigger className="py-0 hover:no-underline [&:hover]:no-underline">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  Members
                </p>
                <Badge variant="neutral">{members.length} members</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-3">
              {members.length === 0 ? (
                <p className="text-xs text-[color:var(--text-tertiary)]">No members in this team.</p>
              ) : (
                <div className="divide-y divide-[color:var(--border-primary)]">
                  {members.map((member) => (
                    <div
                      key={member.employeeId}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <MemberAvatar name={member.displayName} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                            {member.displayName}
                          </p>
                          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                            {member.jobTitle}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={member.employeeStatus} dot />
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      setTeams(readCollection<Team>("teams"));
      setEmployees(readCollection<DemoEmployee>("employees"));
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

  return (
    <div className="relative">
      {/* Gradient blur accent — page header area only */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-48 w-full overflow-hidden"
        aria-hidden="true"
      >
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
          <StatCard label="Total Teams" value={loading ? "—" : teams.length} />
          <StatCard label="Active Members" value={loading ? "—" : totalActiveMembers} />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6">
            <ErrorState message={error} onRetry={load} />
          </div>
        )}

        {/* Team grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !error && teams.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No teams configured"
            body="Teams and org structure will appear here once configured."
          />
        ) : !error ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const lead = team.leadEmployeeId
                ? employeeMap.get(team.leadEmployeeId)
                : undefined;
              const members = team.memberIds
                .map((id) => employeeMap.get(id))
                .filter((e): e is DemoEmployee => e !== undefined);
              return (
                <TeamCard
                  key={team.id}
                  team={team}
                  lead={lead}
                  members={members}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
