"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, StatusBadge, UserAvatar } from "@/shared/ui";
import type { OrgReportingNode } from "./org-chart";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, src, size = 7 }: { name: string; src?: string | null; size?: 7 | 9 }) {
  const dim = size === 9 ? "h-9 w-9" : "h-7 w-7";
  const textSize = size === 9 ? "text-[12px]" : "text-[12px]";
  return (
    <UserAvatar
      src={src}
      fallback={initials(name)}
      className={`flex-shrink-0 ${dim}`}
      fallbackClassName={`${textSize} font-bold text-white`}
    />
  );
}

// ─── reporting-tree node (real employees, supervisor → direct reports) ─────────

interface ReportingTreeNodeProps {
  node: OrgReportingNode;
  expanded: Set<string>;
  onToggle: (employeeId: string) => void;
  onOpenProfile: (employeeId: string) => void;
  depth?: number;
}

/**
 * One person in the reporting tree, with their direct reports nested beneath.
 * Driven entirely by the real employees list (id, fullName, jobTitle, status, supervisor).
 */
export function ReportingTreeNode({
  node,
  expanded,
  onToggle,
  onOpenProfile,
  depth = 0,
}: ReportingTreeNodeProps) {
  const { employee } = node;
  const isOpen = expanded.has(employee.id);
  const hasReports = node.children.length > 0;

  return (
    <div
      className={
        depth > 0
          ? "ml-4 border-l border-[color:var(--border-primary)] pl-4 sm:ml-6 sm:pl-6"
          : ""
      }
    >
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {hasReports ? (
              <button
                type="button"
                onClick={() => onToggle(employee.id)}
                aria-expanded={isOpen}
                aria-label={
                  isOpen
                    ? `Collapse reports of ${employee.fullName}`
                    : `Expand reports of ${employee.fullName}`
                }
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[color:var(--text-tertiary)] hover:bg-[var(--gray-50)]"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={() => onOpenProfile(employee.id)}
              className="flex min-w-0 items-center gap-2 rounded-md text-left hover:bg-[var(--gray-50)]"
            >
              <Avatar name={employee.fullName} src={employee.avatarUrl} size={9} />
              <span className="min-w-0">
                <span
                  title={employee.fullName}
                  className="block truncate text-sm font-bold text-[color:var(--text-primary)]"
                >
                  {employee.fullName}
                </span>
                <span
                  title={employee.jobTitle ?? undefined}
                  className="block truncate text-xs text-[color:var(--text-tertiary)]"
                >
                  {employee.jobTitle ?? "—"}
                </span>
              </span>
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {hasReports ? (
              <Badge variant="neutral">{node.children.length} reports</Badge>
            ) : null}
            <StatusBadge status={employee.status} dot />
          </div>
        </div>
      </div>

      {isOpen && hasReports && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <ReportingTreeNode
              key={child.employee.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onOpenProfile={onOpenProfile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
