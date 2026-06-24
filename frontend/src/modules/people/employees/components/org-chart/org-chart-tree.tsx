"use client";

import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge, UserAvatar } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { OrgChartItem } from "./org-chart";

/**
 * Gradient-pink outline for a person card that matches the active search. Uses the
 * double-background trick (inner white on padding-box + brand gradient on border-box) so the
 * gradient hugs the card's rounded corners — a plain `border-image` would square them off.
 */
const MATCH_OUTLINE_STYLE: React.CSSProperties = {
  boxShadow: "var(--shadow-xs)",
  backgroundImage:
    "linear-gradient(#fff, #fff), linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <UserAvatar
      src={src}
      fallback={initials(name)}
      className="mx-auto h-10 w-10"
      fallbackClassName="text-xs font-bold text-white"
      fallbackStyle={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
    />
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
  /** Employee ids matching the active search — their person cards get a gradient-pink outline. */
  matchedIds?: Set<string>;
}

/**
 * Top-down, collapsible organization chart. Renders the org root (CEO) at the top, every
 * department beneath it, and each department's employees as a supervisor hierarchy, connected
 * with lines. Wrap in a horizontally scrollable container — wide orgs exceed the viewport.
 */
export function OrgChartTree({ nodes, expanded, onToggle, onOpenProfile, matchedIds }: OrgChartTreeProps) {
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
          matchedIds={matchedIds}
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
  matchedIds?: Set<string>;
}

/** One card (person or department) plus its children beneath it when expanded. */
function OrgChartNode({ node, expanded, onToggle, onOpenProfile, matchedIds }: OrgChartNodeProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  // A person card matching the active search gets a gradient-pink outline.
  const matched = node.kind === "person" && Boolean(matchedIds?.has(node.employee.id));

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
      className="mt-2 inline-flex items-center gap-1 rounded-full border border-[color:var(--border-primary)] px-2 py-0.5 text-[12px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
    >
      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      {node.children.length}
    </button>
  ) : null;

  // Avatar + name + role, shared between the plain and clickable person-card variants.
  const personIdentity =
    node.kind === "person" ? (
      <>
        <Avatar name={node.employee.fullName} src={node.employee.avatarUrl} />
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
          className={cn(
            "w-[200px] rounded-xl bg-white p-3 text-center",
            matched ? "border-2 border-transparent" : "border border-[color:var(--border-primary)]",
          )}
          style={matched ? MATCH_OUTLINE_STYLE : { boxShadow: "var(--shadow-xs)" }}
        >
          {onOpenProfile ? (
            <button
              type="button"
              onClick={() => onOpenProfile(node.employee.id)}
              aria-label={`View ${node.employee.fullName}'s details`}
              className="block w-full rounded-md"
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
              matchedIds={matchedIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
