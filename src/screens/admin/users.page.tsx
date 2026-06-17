"use client";

import { useState, useMemo, useCallback } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  DataTable,
  EmptyState,
  FilterBar,
  ConfirmProvider,
  useConfirm,
  type Column,
} from "@/shared/ui";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { UserAccount, DemoEmployee, Role } from "@/shared/mock/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  user: UserAccount;
  employee: DemoEmployee | undefined;
  displayName: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_OPTIONS: Role[] = ["ADMIN", "HR", "EMPLOYEE"];
const ALL_ROLES = "ALL";

function roleBadgeVariant(role: Role): "error" | "warning" | "neutral" {
  if (role === "ADMIN") return "error";
  if (role === "HR") return "warning";
  return "neutral";
}

function roleLabel(role: Role): string {
  if (role === "ADMIN") return "Admin";
  if (role === "HR") return "HR";
  return "Employee";
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length > 0) return parts[0][0].toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useUsers() {
  const [tick, setTick] = useState(0);

  const rows: UserRow[] = useMemo(() => {
    const users = readCollection<UserAccount>("users");
    const employees = readCollection<DemoEmployee>("employees");
    const empMap = new Map(employees.map((e) => [e.employeeId, e]));

    return users.map((user) => {
      const emp = empMap.get(user.employeeId);
      return {
        user,
        employee: emp,
        displayName: emp?.displayName ?? user.email,
        email: user.email,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const activeAdminCount = useMemo(
    () => rows.filter((r) => r.user.isActive && r.user.role === "ADMIN").length,
    [rows],
  );

  const isOnlyActiveAdmin = useCallback(
    (userId: string) => {
      const row = rows.find((r) => r.user.id === userId);
      return (
        !!row &&
        row.user.isActive &&
        row.user.role === "ADMIN" &&
        activeAdminCount === 1
      );
    },
    [rows, activeAdminCount],
  );

  const changeRole = useCallback(
    (userId: string, newRole: Role) => {
      if (isOnlyActiveAdmin(userId) && newRole !== "ADMIN") {
        toast.error("Cannot demote the only active admin.");
        return;
      }

      const users = readCollection<UserAccount>("users");
      const employees = readCollection<DemoEmployee>("employees");

      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, role: newRole } : u,
      );
      const updatedEmployees = employees.map((e) =>
        e.employeeId === targetUser.employeeId ? { ...e, role: newRole } : e,
      );

      writeCollection<UserAccount>("users", updatedUsers);
      writeCollection<DemoEmployee>("employees", updatedEmployees);
      setTick((t) => t + 1);
      toast.success(`Role updated to ${roleLabel(newRole)}.`);
    },
    [isOnlyActiveAdmin],
  );

  const deactivate = useCallback((userId: string) => {
    if (isOnlyActiveAdmin(userId)) {
      toast.error("Cannot deactivate the only active admin.");
      return;
    }

    const users = readCollection<UserAccount>("users");
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, isActive: false } : u,
    );
    writeCollection<UserAccount>("users", updatedUsers);
    setTick((t) => t + 1);
    toast.success("User deactivated.");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnlyActiveAdmin]);

  return { rows, isOnlyActiveAdmin, changeRole, deactivate };
}

// ---------------------------------------------------------------------------
// Page shell — provides ConfirmProvider
// ---------------------------------------------------------------------------

export default function UsersPage() {
  return (
    <ConfirmProvider>
      <UsersPageInner />
    </ConfirmProvider>
  );
}

// ---------------------------------------------------------------------------
// Inner page — uses useConfirm, useUsers
// ---------------------------------------------------------------------------

function UsersPageInner() {
  const confirm = useConfirm();
  const { rows, isOnlyActiveAdmin, changeRole, deactivate } = useUsers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | typeof ALL_ROLES>(ALL_ROLES);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.displayName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === ALL_ROLES || r.user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [rows, search, roleFilter]);

  const handleDeactivate = useCallback(
    async (row: UserRow) => {
      if (isOnlyActiveAdmin(row.user.id)) {
        toast.error("Cannot deactivate the only active admin.");
        return;
      }
      const confirmed = await confirm({
        title: "Deactivate user",
        description: `Are you sure you want to deactivate ${row.displayName}? They will lose access immediately.`,
        confirmLabel: "Deactivate",
        cancelLabel: "Cancel",
        destructive: true,
      });
      if (confirmed) {
        deactivate(row.user.id);
      }
    },
    [confirm, deactivate, isOnlyActiveAdmin],
  );

  const columns: Column<UserRow>[] = [
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
            }}
          >
            {getInitials(row.displayName, row.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {row.displayName}
            </p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={roleBadgeVariant(row.user.role)}>{roleLabel(row.user.role)}</Badge>
          <Select
            value={row.user.role}
            onValueChange={(val) => changeRole(row.user.id, val as Role)}
            disabled={!row.user.isActive}
          >
            <SelectTrigger
              className="h-7 w-[110px] text-xs"
              aria-label={`Change role for ${row.displayName}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.user.isActive}
            disabled
            aria-label={row.user.isActive ? "Active" : "Inactive"}
          />
          <span className="text-sm text-[color:var(--text-secondary)]">
            {row.user.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => {
        const locked = isOnlyActiveAdmin(row.user.id);
        const alreadyInactive = !row.user.isActive;
        return (
          <Button
            variant="destructive"
            size="sm"
            disabled={locked || alreadyInactive}
            onClick={() => void handleDeactivate(row)}
            title={
              locked
                ? "Cannot deactivate the only active admin"
                : alreadyInactive
                ? "User is already inactive"
                : undefined
            }
          >
            Deactivate
          </Button>
        );
      },
    },
  ];

  const hasFilters = Boolean(search || roleFilter !== ALL_ROLES);

  return (
    <div>
      <PageHeader
        level="page"
        title="User management"
        subtitle="Manage user accounts, roles, and access across the organization."
      />

      <FilterBar aria-label="Filter users">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search users"
          className="sm:max-w-[320px]"
        />
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as Role | typeof ALL_ROLES)}
        >
          <SelectTrigger className="sm:w-[180px]" aria-label="Filter by role">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES}>All roles</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(row) => row.user.id}
          emptyState={
            <EmptyState
              icon={Users}
              title={hasFilters ? "No matching users" : "No users found"}
              body={
                hasFilters
                  ? "Try a different search or role filter."
                  : "No user accounts have been created yet."
              }
            />
          }
        />
      </div>
    </div>
  );
}
