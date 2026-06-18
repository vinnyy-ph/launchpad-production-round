import { authFetch } from "@/shared/lib/api-client";
import type {
  AddUserRequest,
  UpdateRoleRequest,
  UserFilters,
  UserResponse,
  UsersListResponse,
} from "../types/users.types";

function buildUsersQuery(filters: UserFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.role) params.set("role", filters.role);
  if (filters.isActive != null) params.set("isActive", String(filters.isActive));
  if (filters.includeDeactivated) params.set("includeDeactivated", "true");
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getUsers(filters: UserFilters = {}): Promise<UsersListResponse> {
  return authFetch<UsersListResponse>(`/api/v1/users${buildUsersQuery(filters)}`);
}

export async function addUser(body: AddUserRequest): Promise<UserResponse> {
  return authFetch<UserResponse>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deactivateUser(userId: string): Promise<UserResponse> {
  return authFetch<UserResponse>(`/api/v1/users/${userId}/deactivate`, {
    method: "PATCH",
  });
}

export async function updateUserRole(
  userId: string,
  body: UpdateRoleRequest
): Promise<UserResponse> {
  return authFetch<UserResponse>(`/api/v1/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
