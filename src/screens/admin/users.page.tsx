"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Users, Plus } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
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
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const users = readCollection<UserAccount>("users");
      const employees = readCollection<DemoEmployee>("employees");
      const empMap = new Map(employees.map((e) => [e.employeeId, e]));
      setRows(users.map((user) => {
        const emp = empMap.get(user.employeeId);
        return { user, employee: emp, displayName: emp?.displayName ?? user.email, email: user.email };
      }));
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => { reload(); }, [reload]);

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

  // Create both an employee row and an active user account.
  const inviteUser = useCallback((input: { displayName: string; email: string; role: Role }) => {
    const employees = readCollection<DemoEmployee>("employees");
    const users = readCollection<UserAccount>("users");

    const emailLower = input.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailLower)) {
      toast.error("A user with this email already exists.");
      return false;
    }

    const stamp = Date.now().toString(36);
    const employeeId = `e-${stamp}`;
    const userId = `u-${stamp}`;
    const now = new Date().toISOString();

    const newEmployee: DemoEmployee = {
      employeeId,
      userId,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
      role: input.role,
      isSupervisor: false,
      isActive: true,
      jobTitle: input.role === "ADMIN" ? "Admin" : input.role === "HR" ? "HR" : "Employee",
      department: input.role === "HR" ? "People" : "Unassigned",
      employeeStatus: "ACTIVE",
      supervisorId: null,
      teamId: null,
      startDate: now.slice(0, 10),
    };
    const newUser: UserAccount = {
      id: userId,
      employeeId,
      email: input.email.trim(),
      role: input.role,
      isActive: true,
      lastActiveAt: now,
    };

    writeCollection<DemoEmployee>("employees", [...employees, newEmployee]);
    writeCollection<UserAccount>("users", [...users, newUser]);
    setTick((t) => t + 1);
    toast.success(`${newEmployee.displayName} invited.`);
    return true;
  }, []);

  return { rows, loading, error, reload, isOnlyActiveAdmin, changeRole, deactivate, inviteUser };
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
  const { rows, loading, error, reload, isOnlyActiveAdmin, changeRole, deactivate, inviteUser } = useUsers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | typeof ALL_ROLES>(ALL_ROLES);
  const [inviteOpen, setInviteOpen] = useState(false);

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
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus aria-hidden="true" />
            Invite user
          </Button>
        }
      />

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={inviteUser} />

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
          isLoading={loading}
          error={error}
          onRetry={reload}
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
              action={hasFilters ? undefined : { label: "Invite user", onClick: () => setInviteOpen(true) }}
            />
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite user dialog
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InviteUserDialog({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (input: { displayName: string; email: string; role: Role }) => boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  function reset() {
    setName("");
    setEmail("");
    setRole("EMPLOYEE");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (next.name || next.email) return;

    const ok = onInvite({ displayName: name, email, role });
    if (ok) {
      reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            Create an account and employee record. The user becomes active immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Full name" htmlFor="invite-name" required error={errors.name}>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Park"
              autoFocus
            />
          </FormField>
          <FormField label="Email" htmlFor="invite-email" required error={errors.email}>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@swiftwork.demo"
            />
          </FormField>
          <FormField label="Role" htmlFor="invite-role">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="invite-role">
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
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Invite user</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
