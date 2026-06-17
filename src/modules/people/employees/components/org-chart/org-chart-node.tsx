"use client";

import { ChevronDown, ChevronRight, UserCog } from "lucide-react";
import { Badge, Button, StatusBadge } from "@/shared/ui";
import type { DemoEmployee } from "@/shared/mock/types";
import type { OrgTeamNode } from "./org-chart";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── node ───────────────────────────────────────────────────────────────────

interface OrgChartNodeProps {
  node: OrgTeamNode;
  employeeMap: Map<string, DemoEmployee>;
  expanded: Set<string>;
  onToggle: (teamId: string) => void;
  onOpenProfile: (employeeId: string) => void;
  onChangeLead: (teamId: string) => void;
  onMoveMember: (employeeId: string) => void;
  depth?: number;
}

export function OrgChartNode({
  node,
  employeeMap,
  expanded,
  onToggle,
  onOpenProfile,
  onChangeLead,
  onMoveMember,
  depth = 0,
}: OrgChartNodeProps) {
  const isOpen = expanded.has(node.team.id);
  const lead = node.team.leadEmployeeId ? employeeMap.get(node.team.leadEmployeeId) : undefined;
  const members = node.team.memberIds
    .map((id) => employeeMap.get(id))
    .filter((e): e is DemoEmployee => e !== undefined);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-4 border-l border-[color:var(--border-primary)] pl-4 sm:ml-6 sm:pl-6" : ""}>
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(node.team.id)}
              aria-expanded={isOpen}
              aria-label={isOpen ? `Collapse ${node.team.name}` : `Expand ${node.team.name}`}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[color:var(--text-tertiary)] hover:bg-[var(--gray-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <p className="truncate text-sm font-bold text-[color:var(--text-primary)]">{node.team.name}</p>
            <Badge variant="neutral">{members.length} members</Badge>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onChangeLead(node.team.id)}
            aria-label={`Change lead for ${node.team.name}`}
          >
            <UserCog aria-hidden="true" />
            Change lead
          </Button>
        </div>

        {/* Lead */}
        <div className="mt-3 pl-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Team lead
          </p>
          {lead ? (
            <button
              type="button"
              onClick={() => onOpenProfile(lead.employeeId)}
              className="mt-1.5 flex items-center gap-2 rounded-md py-1 text-left hover:bg-[var(--gray-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar name={lead.displayName} size={9} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                  {lead.displayName}
                </span>
                <span className="block text-xs text-[color:var(--text-tertiary)]">{lead.jobTitle}</span>
              </span>
            </button>
          ) : (
            <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">No lead assigned</p>
          )}
        </div>

        {/* Members (only when expanded) */}
        {isOpen && (
          <div className="mt-4 pl-8">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Members
            </p>
            {members.length === 0 ? (
              <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)]">No members in this team.</p>
            ) : (
              <div className="mt-1.5 divide-y divide-[color:var(--border-primary)]">
                {members.map((member) => (
                  <div key={member.employeeId} className="flex items-center justify-between gap-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(member.employeeId)}
                      className="flex min-w-0 items-center gap-2 rounded-md text-left hover:bg-[var(--gray-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar name={member.displayName} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                          {member.displayName}
                        </span>
                        <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                          {member.jobTitle}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <StatusBadge status={member.employeeStatus} dot />
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onMoveMember(member.employeeId)}
                        aria-label={`Move ${member.displayName} to another team`}
                      >
                        Move
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Child teams (only when expanded) */}
      {isOpen && hasChildren && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <OrgChartNode
              key={child.team.id}
              node={child}
              employeeMap={employeeMap}
              expanded={expanded}
              onToggle={onToggle}
              onOpenProfile={onOpenProfile}
              onChangeLead={onChangeLead}
              onMoveMember={onMoveMember}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
