"use client";

import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/shared/ui";
import type { OrgChartItem } from "./org-chart";

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
  /** Top-level nodes of the chart: the org root (CEO) → departments → in-department hierarchy. */
  nodes: OrgChartItem[];
  /** Node ids whose children are currently shown. */
  expanded: Set<string>;
  onToggle: (nodeId: string) => void;
  /** When provided, person cards become clickable and call this with the employee id. */
  onOpenProfile?: (employeeId: string) => void;
}

/**
 * Top-down, collapsible organization chart. Renders the org root (CEO) at the top, every
 * department beneath it, and each department's employees as a supervisor hierarchy, connected
 * with lines. Wrap in a horizontally scrollable container — wide orgs exceed the viewport.
 */
export function OrgChartTree({ nodes, expanded, onToggle, onOpenProfile }: OrgChartTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="org-tree">
      {nodes.map((node) => (
        <OrgChartNode
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={onToggle}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </ul>
  );
}

interface OrgChartNodeProps {
  node: OrgChartItem;
  expanded: Set<string>;
  onToggle: (nodeId: string) => void;
  onOpenProfile?: (employeeId: string) => void;
}

/** One card (person or department) plus its children beneath it when expanded. */
function OrgChartNode({ node, expanded, onToggle, onOpenProfile }: OrgChartNodeProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);

  const toggle = hasChildren ? (
    <button
      type="button"
      onClick={() => onToggle(node.id)}
      aria-expanded={isOpen}
      aria-label={
        isOpen
          ? `Collapse ${node.kind === "department" ? node.label : node.employee.fullName}`
          : `Expand ${node.kind === "department" ? node.label : node.employee.fullName}`
      }
      className="mt-2 inline-flex items-center gap-1 rounded-full border border-[color:var(--border-primary)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      {node.children.length}
    </button>
  ) : null;

  // Avatar + name + role, shared between the plain and clickable person-card variants.
  const personIdentity =
    node.kind === "person" ? (
      <>
        <Avatar name={node.employee.fullName} />
        <p className="mt-2 truncate text-sm font-bold text-[color:var(--text-primary)]">
          {node.employee.fullName}
        </p>
        <p className="truncate text-xs text-[color:var(--text-tertiary)]">
          {node.employee.jobTitle ?? "—"}
        </p>
      </>
    ) : null;

  return (
    <li>
      {node.kind === "department" ? (
        <div
          className="w-[200px] rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3 text-center"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <span
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[color:var(--text-secondary)]"
            aria-hidden="true"
          >
            <Building2 className="h-5 w-5" />
          </span>
          <p className="mt-2 truncate text-sm font-bold text-[color:var(--text-primary)]">
            {node.label}
          </p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
            {node.count} {node.count === 1 ? "member" : "members"}
          </p>
          {toggle}
        </div>
      ) : (
        <div
          className="w-[200px] rounded-xl border border-[color:var(--border-primary)] bg-white p-3 text-center"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {onOpenProfile ? (
            <button
              type="button"
              onClick={() => onOpenProfile(node.employee.id)}
              aria-label={`View ${node.employee.fullName}'s details`}
              className="block w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {personIdentity}
            </button>
          ) : (
            personIdentity
          )}
          <div className="mt-2 flex justify-center">
            <StatusBadge status={node.employee.status} dot />
          </div>
          {toggle}
        </div>
      )}

      {hasChildren && isOpen && (
        <ul>
          {node.children.map((child) => (
            <OrgChartNode
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
