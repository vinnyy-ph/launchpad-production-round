"use client";

import { useCallback, useMemo, useState } from "react";
import { Users, Plus, ArrowLeftRight, Ban, Check, Filter } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/modules/auth";
import {
  useUsers,
  useAddUser,
  useUpdateRole,
  useDeactivateUser,
  UserRoleBadge,
  roleLabel,
  formatLastLogin,
  type AddUserRole,
  type ChangeableRole,
  type UserListItem,
  type UserRole,
  type UserSortField,
  type UserSortOrder,
} from "@/modules/people/users";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Spinner,
  TablePagination,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type Column,
} from "@/shared/ui";

const ALL_ROLES = "ALL";
const ALL_STATUSES = "ALL";
const ADD_USER_ROLES: AddUserRole[] = ["ADMIN", "HR", "EMPLOYEE"];
const CHANGEABLE_ROLES: ChangeableRole[] = ["ADMIN", "HR", "EMPLOYEE"];
const FILTER_ROLES: UserRole[] = ["ADMIN", "HR", "EMPLOYEE"];
const STATUS_OPTIONS = [
  { value: ALL_STATUSES, label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DEACTIVATED", label: "Deactivated" },
] as const;
const PAGE_SIZE = 10;

function statusFilters(status: (typeof STATUS_OPTIONS)[number]["value"]) {
  if (status === "ACTIVE") return { isActive: true };
  if (status === "DEACTIVATED") return { isActive: false, includeDeactivated: true };
  return { includeDeactivated: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function displayName(user: UserListItem): string {
  return (
    user.fullName ??
    ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email)
  );
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length > 0) return parts[0][0].toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

export default function UsersPage() {
  return (
    <ConfirmProvider>
      <UsersPageInner />
    </ConfirmProvider>
  );
}

function UsersPageInner() {
  const confirm = useConfirm();
  const { appUser } = useAuth();
  const currentUserId = appUser?.userId ?? null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | typeof ALL_ROLES>(ALL_ROLES);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>(ALL_STATUSES);
  const [sortBy, setSortBy] = useState<UserSortField>("name");
  const [sortOrder, setSortOrder] = useState<UserSortOrder>("asc");
  const [inviteOpen, setInviteOpen] = useState(false);

  const { users, meta, loading, error, reload } = useUsers({
    page,
    limit: PAGE_SIZE,
    role: roleFilter === ALL_ROLES ? undefined : roleFilter,
    ...statusFilters(statusFilter),
    sortBy,
    sortOrder,
  });

  const { meta: adminMeta } = useUsers({
    role: "ADMIN",
    isActive: true,
    limit: 1,
    page: 1,
  });
  const activeAdminCount = adminMeta?.total ?? 0;

  const { addUserAsync, isAdding } = useAddUser();
  const { updateRoleAsync, isUpdating } = useUpdateRole();
  const { deactivateUserAsync, isDeactivating } = useDeactivateUser();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const name = displayName(user).toLowerCase();
      return name.includes(q) || user.email.toLowerCase().includes(q);
    });
  }, [users, search]);

  const isOnlyActiveAdmin = useCallback(
    (user: UserListItem) =>
      user.isActive && user.role === "ADMIN" && activeAdminCount <= 1,
    [activeAdminCount],
  );

  const isSelf = useCallback(
    (userId: string) => currentUserId != null && userId === currentUserId,
    [currentUserId],
  );

  const handleDeactivate = useCallback(
    async (user: UserListItem) => {
      if (isSelf(user.id)) return;
      if (isOnlyActiveAdmin(user)) return;

      await confirm({
        title: "Deactivate user",
        description: `Are you sure you want to deactivate ${displayName(user)}? They will lose access immediately. Their data and history will remain.`,
        confirmLabel: "Deactivate",
        confirmLoadingLabel: "Deactivating…",
        cancelLabel: "Cancel",
        destructive: true,
        onConfirm: () => deactivateUserAsync(user.id),
      });
    },
    [confirm, deactivateUserAsync, isOnlyActiveAdmin, isSelf],
  );

  const handleRoleChange = useCallback(
    async (user: UserListItem, newRole: ChangeableRole) => {
      if (isSelf(user.id)) return;
      if (!user.isActive) return;
      if (user.role === newRole) return;
      if (isOnlyActiveAdmin(user) && user.role === "ADMIN") return;

      const name = displayName(user);
      await confirm({
        title: "Change user role",
        description: `Are you sure you want to change ${name}'s role from ${roleLabel(user.role)} to ${roleLabel(newRole)}? Their access permissions will update immediately.`,
        confirmLabel: "Change role",
        confirmLoadingLabel: "Changing…",
        cancelLabel: "Cancel",
        onConfirm: () => updateRoleAsync({ userId: user.id, role: newRole }),
      });
    },
    [confirm, isOnlyActiveAdmin, isSelf, updateRoleAsync],
  );

  const handleSort = useCallback(
    (column: UserSortField) => {
      setPage(1);
      if (sortBy === column) {
        setSortOrder((direction) => (direction === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(column);
        setSortOrder("asc");
      }
    },
    [sortBy],
  );

  const sortHeader = useCallback(
    (label: string, column: UserSortField) => (
      <SortableHeader
        label={label}
        column={column}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
    ),
    [handleSort, sortBy, sortOrder],
  );

  const columns: Column<UserListItem>[] = [
    {
      header: sortHeader("Name", "name"),
      cell: (user) => {
        const name = displayName(user);
        return (
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
              }}
            >
              {getInitials(name, user.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                {name}
              </p>
              <p className="truncate text-xs text-[color:var(--text-tertiary)]">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: sortHeader("Role", "role"),
      mobileLabel: "Role",
      cell: (user) => <UserRoleBadge role={user.role} />,
    },
    {
      header: sortHeader("Status", "status"),
      mobileLabel: "Status",
      cell: (user) => (
        <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: sortHeader("Last login", "lastLogin"),
      mobileLabel: "Last login",
      cell: (user) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {formatLastLogin(user.lastLoginAt)}
        </span>
      ),
    },
    {
      header: "",
      mobileFooter: true,
      className: "w-[1%] whitespace-nowrap text-right",
      cell: (user) => (
        <UserRowActions
          user={user}
          displayName={displayName(user)}
          isSelf={isSelf(user.id)}
          isOnlyActiveAdmin={isOnlyActiveAdmin(user)}
          isUpdating={isUpdating}
          isDeactivating={isDeactivating}
          onRoleChange={handleRoleChange}
          onDeactivate={handleDeactivate}
        />
      ),
    },
  ];

  const hasFilters = Boolean(
    search || roleFilter !== ALL_ROLES || statusFilter !== ALL_STATUSES,
  );
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="min-w-0">
      <PageHeader
        level="page"
        title="User Management"
        subtitle="Manage user accounts, roles, and access across the organization."
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={addUserAsync}
        isSubmitting={isAdding}
      />

      <FilterBar aria-label="Filter users" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="w-full sm:max-w-[320px]"
          />
          <div className="flex w-full gap-2 md:hidden">
            <Select
              value={sortBy}
              onValueChange={(v: string) => {
                setSortBy(v as UserSortField);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="lastLogin">Last login</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setSortOrder((direction) => (direction === "asc" ? "desc" : "asc"));
                setPage(1);
              }}
              aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
            >
              <SortIcon active direction={sortOrder} />
            </Button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v: string) => {
              setStatusFilter(v as (typeof STATUS_OPTIONS)[number]["value"]);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="relative w-full pl-9 sm:w-[180px]"
              aria-label="Filter by status"
            >
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
                aria-hidden="true"
              />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(v: string) => {
              setRoleFilter(v as UserRole | typeof ALL_ROLES);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="relative w-full pl-9 sm:w-[180px]"
              aria-label="Filter by role"
            >
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
                aria-hidden="true"
              />
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROLES}>All roles</SelectItem>
              {FILTER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="w-full shrink-0 sm:ml-auto sm:w-auto"
        >
          <Plus aria-hidden="true" />
          Add user
        </Button>
      </FilterBar>

      <div
        className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={loading}
          error={error}
          onRetry={() => void reload()}
          getRowId={(user) => user.id}
          emptyState={
            <EmptyState
              icon={Users}
              title={hasFilters ? "No matching users" : "No users found"}
              body={
                hasFilters
                  ? "Try a different search or role filter."
                  : "No user accounts have been created yet."
              }
              action={
                hasFilters ? undefined : { label: "Add user", onClick: () => setInviteOpen(true) }
              }
            />
          }
        />
        {meta && meta.totalPages > 1 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: UserSortOrder;
}) {
  return (
    <span aria-hidden="true" className="inline-flex flex-col items-center gap-[2px]">
      <span
        className={cn(
          "h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent",
          active && direction === "asc"
            ? "border-b-[color:var(--text-primary)]"
            : "border-b-[color:var(--gray-neutral-300)]",
        )}
      />
      <span
        className={cn(
          "h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent",
          active && direction === "desc"
            ? "border-t-[color:var(--text-primary)]"
            : "border-t-[color:var(--gray-neutral-300)]",
        )}
      />
    </span>
  );
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  column: UserSortField;
  sortBy: UserSortField;
  sortOrder: UserSortOrder;
  onSort: (column: UserSortField) => void;
}) {
  const active = sortBy === column;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.8px] text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <SortIcon active={active} direction={active ? sortOrder : undefined} />
    </button>
  );
}

function UserRowActions({
  user,
  displayName: name,
  isSelf,
  isOnlyActiveAdmin,
  isUpdating,
  isDeactivating,
  onRoleChange,
  onDeactivate,
}: {
  user: UserListItem;
  displayName: string;
  isSelf: boolean;
  isOnlyActiveAdmin: boolean;
  isUpdating: boolean;
  isDeactivating: boolean;
  onRoleChange: (user: UserListItem, role: ChangeableRole) => void | Promise<void>;
  onDeactivate: (user: UserListItem) => void | Promise<void>;
}) {
  const roleLocked =
    !user.isActive ||
    isSelf ||
    (isOnlyActiveAdmin && user.role === "ADMIN");
  const deactivateLocked = !user.isActive || isSelf || isOnlyActiveAdmin;

  const onlyAdminMessage =
    "This is the only active admin. Promote or add another admin before making changes.";

  const buttonGroup = (
    <div className="inline-flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[color:var(--text-tertiary)] hover:bg-gray-50 hover:text-[color:var(--text-secondary)]"
            disabled={roleLocked || isUpdating}
            aria-label={`Change role for ${name}`}
            title={
              roleLocked
                ? isSelf
                  ? "You cannot change your own role"
                  : !user.isActive
                    ? "Cannot change role for inactive users"
                    : isOnlyActiveAdmin
                      ? undefined
                      : "Cannot demote the only active admin"
                : "Change role"
            }
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs font-normal text-[color:var(--text-tertiary)]">
            Change role to
          </DropdownMenuLabel>
          {CHANGEABLE_ROLES.map((role) => (
            <DropdownMenuItem
              key={role}
              disabled={roleLocked || isUpdating}
              className="justify-between"
              onClick={() => {
                if (user.role !== role) void onRoleChange(user, role);
              }}
            >
              {roleLabel(role)}
              {user.role === role ? (
                <Check className="h-4 w-4 text-[color:var(--text-primary)]" strokeWidth={2.5} />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-[#D92D20] hover:bg-[#FEF3F2] hover:text-[#D92D20]"
        disabled={deactivateLocked || isDeactivating}
        onClick={() => void onDeactivate(user)}
        aria-label={`Deactivate ${name}`}
        title={
          isSelf
            ? "You cannot deactivate your own account"
            : deactivateLocked
              ? !user.isActive
                ? "User is already inactive"
                : isOnlyActiveAdmin
                  ? undefined
                  : "Cannot deactivate the only active admin"
              : "Deactivate user"
        }
      >
        <Ban className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex w-full justify-end">
      {isOnlyActiveAdmin ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{buttonGroup}</TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-[260px] text-center">
              {onlyAdminMessage}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        buttonGroup
      )}
    </div>
  );
}

function InviteUserDialog({
  open,
  onOpenChange,
  onInvite,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (input: {
    firstName: string;
    lastName: string;
    email: string;
    role: AddUserRole;
  }) => Promise<unknown>;
  isSubmitting: boolean;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AddUserRole>("EMPLOYEE");
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string }>(
    {},
  );

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("EMPLOYEE");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next && isSubmitting) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit() {
    const next: { firstName?: string; lastName?: string; email?: string } = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (next.firstName || next.lastName || next.email) return;

    try {
      await onInvite({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
      });
      reset();
      onOpenChange(false);
    } catch {
      // Error toast handled by mutation hook.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create an account and employee record. The user can sign in with Google once their email
            matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="First name" htmlFor="invite-first-name" required error={errors.firstName}>
            <Input
              id="invite-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Jordan"
              autoFocus
            />
          </FormField>
          <FormField label="Last name" htmlFor="invite-last-name" required error={errors.lastName}>
            <Input
              id="invite-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Park"
            />
          </FormField>
          <FormField label="Company Email" htmlFor="invite-email" required error={errors.email}>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </FormField>
          <FormField label="Role" htmlFor="invite-role">
            <Select value={role} onValueChange={(v: string) => setRole(v as AddUserRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADD_USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size={16} />
                Adding…
              </>
            ) : (
              "Add user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
