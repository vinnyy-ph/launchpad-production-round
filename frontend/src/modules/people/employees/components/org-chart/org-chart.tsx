"use client";

import { useMemo } from "react";
import type { EmployeeListItem } from "../../types/employees.types";
import { ReportingTreeNode } from "./org-chart-node";

// ─── reporting tree (real employees, supervisor → direct reports) ─────────────

export interface OrgReportingNode {
  employee: EmployeeListItem;
  children: OrgReportingNode[];
}

/**
 * Build the reporting forest from the real employees list via `supervisor.id`.
 * Anyone whose supervisor is missing from the list (or who has no supervisor) becomes a root,
 * so a partial/redacted list still renders without orphaning rows.
 */
export function buildReportingTree(employees: EmployeeListItem[]): OrgReportingNode[] {
  const byId = new Map<string, OrgReportingNode>();
  for (const employee of employees) byId.set(employee.id, { employee, children: [] });

  const roots: OrgReportingNode[] = [];
  for (const node of byId.values()) {
    const supervisorId = node.employee.supervisor?.id;
    const parent = supervisorId ? byId.get(supervisorId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Every employee id in the list (used for expand-all). */
export function allReportingIds(employees: EmployeeListItem[]): string[] {
  return employees.map((e) => e.id);
}

interface ReportingTreeProps {
  employees: EmployeeListItem[];
  /** When set, render only the subtree rooted at this employee (e.g. a supervisor's own reports). */
  rootId?: string | null;
  expanded: Set<string>;
  onToggle: (employeeId: string) => void;
  onOpenProfile: (employeeId: string) => void;
}

/** Read-only org chart built from the real employees list. */
export function ReportingTree({
  employees,
  rootId,
  expanded,
  onToggle,
  onOpenProfile,
}: ReportingTreeProps) {
  const roots = useMemo(() => {
    const forest = buildReportingTree(employees);
    if (!rootId) return forest;
    const find = (nodes: OrgReportingNode[]): OrgReportingNode | undefined => {
      for (const node of nodes) {
        if (node.employee.id === rootId) return node;
        const hit = find(node.children);
        if (hit) return hit;
      }
      return undefined;
    };
    const rooted = find(forest);
    return rooted ? [rooted] : [];
  }, [employees, rootId]);

  return (
    <div className="space-y-3">
      {roots.map((node) => (
        <ReportingTreeNode
          key={node.employee.id}
          node={node}
          expanded={expanded}
          onToggle={onToggle}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </div>
  );
}
