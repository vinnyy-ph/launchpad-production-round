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

// ─── department-grouped chart (CEO → departments → in-department hierarchy) ─────

/**
 * A node in the department-grouped org chart. Either a person (an employee with their
 * in-department reports nested beneath) or a department grouping (its members' hierarchy
 * nested beneath). `id` is unique across the whole tree and used as the expand/collapse key.
 */
export type OrgChartItem =
  | { kind: "person"; id: string; employee: EmployeeListItem; children: OrgChartItem[] }
  | { kind: "department"; id: string; label: string; count: number; children: OrgChartItem[] };

const NO_DEPARTMENT_LABEL = "No department";

/** Maps a reporting-tree node into a person chart item, recursively converting its reports. */
function toPersonItem(node: OrgReportingNode): OrgChartItem {
  return {
    kind: "person",
    id: node.employee.id,
    employee: node.employee,
    children: node.children.map(toPersonItem),
  };
}

/**
 * Builds a plain top-down reporting chart (no department grouping) from an employee list —
 * e.g. a supervisor's own reporting hierarchy. Anyone whose supervisor is absent from the list
 * becomes a top-level node, so passing a supervisor's subtree yields their direct reports as
 * roots with everyone below them nested beneath.
 */
export function buildReportingChart(employees: EmployeeListItem[]): OrgChartItem[] {
  return buildReportingTree(employees).map(toPersonItem);
}

/**
 * Builds the department-grouped org chart: the organization root (e.g. the CEO) at the top,
 * every department beneath it, and each department's employees arranged by their in-department
 * supervisor hierarchy. Every known department is included — even empty ones — so the full
 * structure is visible. Employees with no department are collected under a "No department"
 * group. When no root exists yet, the departments become the top level so the chart still renders.
 */
export function buildDepartmentOrgChart(
  employees: EmployeeListItem[],
  departmentNames: string[],
): OrgChartItem[] {
  // The org root is the single supervisor-less employee (e.g. the CEO).
  const ceo = employees.find((employee) => employee.supervisor === null) ?? null;
  const others = ceo ? employees.filter((employee) => employee.id !== ceo.id) : employees;

  // A department's hierarchy is just the reporting tree of its own members: a member whose
  // supervisor sits outside the department (e.g. the CEO) naturally becomes a top-level node.
  const departmentItem = (label: string, members: EmployeeListItem[]): OrgChartItem => ({
    kind: "department",
    id: `dept:${label}`,
    label,
    count: members.length,
    children: buildReportingTree(members).map(toPersonItem),
  });

  const sortedNames = [...departmentNames].sort((a, b) => a.localeCompare(b));
  const departmentItems = sortedNames.map((name) =>
    departmentItem(
      name,
      others.filter((employee) => employee.department === name),
    ),
  );

  // Keep anyone (besides the CEO) without a department visible under a dedicated group.
  const undepartmented = others.filter((employee) => !employee.department);
  if (undepartmented.length > 0) {
    departmentItems.push(departmentItem(NO_DEPARTMENT_LABEL, undepartmented));
  }

  if (!ceo) {
    return departmentItems;
  }

  return [{ kind: "person", id: ceo.id, employee: ceo, children: departmentItems }];
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
