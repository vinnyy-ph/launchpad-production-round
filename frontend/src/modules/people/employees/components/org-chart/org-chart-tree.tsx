"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/shared/ui";
import type { OrgReportingNode } from "./org-chart";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

interface OrgChartTreeProps {
  /** Root nodes of the reporting forest (built from supervisor → direct reports). */
  nodes: OrgReportingNode[];
  /** Ids whose direct reports are currently shown. */
  expanded: Set<string>;
  onToggle: (employeeId: string) => void;
}

/**
 * Top-down, collapsible organization chart. Renders the supervisor hierarchy as a tree of
 * person cards connected with lines (CEO at the root). Wrap in a horizontally scrollable
 * container — wide orgs naturally exceed the viewport.
 */
export function OrgChartTree({ nodes, expanded, onToggle }: OrgChartTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="org-tree">
      {nodes.map((node) => (
        <OrgChartNode key={node.employee.id} node={node} expanded={expanded} onToggle={onToggle} />
      ))}
    </ul>
  );
}

interface OrgChartNodeProps {
  node: OrgReportingNode;
  expanded: Set<string>;
  onToggle: (employeeId: string) => void;
}

/** One person card plus their direct reports beneath it when expanded. */
function OrgChartNode({ node, expanded, onToggle }: OrgChartNodeProps) {
  const { employee } = node;
  const hasReports = node.children.length > 0;
  const isOpen = expanded.has(employee.id);

  return (
    <li>
      <div
        className="w-[200px] rounded-xl border border-[color:var(--border-primary)] bg-white p-3 text-center"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <Avatar name={employee.fullName} />
        <p className="mt-2 truncate text-sm font-bold text-[color:var(--text-primary)]">
          {employee.fullName}
        </p>
        <p className="truncate text-xs text-[color:var(--text-tertiary)]">
          {employee.jobTitle ?? "—"}
        </p>
        {employee.department && (
          <p className="truncate text-[11px] text-[color:var(--text-tertiary)]">
            {employee.department}
          </p>
        )}
        <div className="mt-2 flex justify-center">
          <StatusBadge status={employee.status} dot />
        </div>

        {hasReports && (
          <button
            type="button"
            onClick={() => onToggle(employee.id)}
            aria-expanded={isOpen}
            aria-label={
              isOpen
                ? `Collapse reports of ${employee.fullName}`
                : `Expand reports of ${employee.fullName}`
            }
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[color:var(--border-primary)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {node.children.length}
          </button>
        )}
      </div>

      {hasReports && isOpen && (
        <ul>
          {node.children.map((child) => (
            <OrgChartNode
              key={child.employee.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
