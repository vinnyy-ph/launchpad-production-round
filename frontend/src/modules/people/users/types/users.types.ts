export type UserRole = "ADMIN" | "HR" | "EMPLOYEE";
export type AddUserRole = "ADMIN" | "HR" | "EMPLOYEE";
export type ChangeableRole = UserRole;

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  employeeId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  employeeStatus: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UsersListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsersListResponse {
  success: boolean;
  message: string;
  data: UserListItem[];
  meta: UsersListMeta;
}

export interface UserResponse {
  success: boolean;
  message: string;
  data: UserListItem & { updatedAt: string };
}

export type UserSortField = "name" | "role" | "status" | "lastLogin";
export type UserSortOrder = "asc" | "desc";

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  includeDeactivated?: boolean;
  sortBy?: UserSortField;
  sortOrder?: UserSortOrder;
}

export interface AddUserRequest {
  email: string;
  role: AddUserRole;
  firstName: string;
  lastName: string;
}

export interface UpdateRoleRequest {
  role: ChangeableRole;
}
