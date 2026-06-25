/**
 * Field names used in user API validation and error responses.
 */
export const USER_FIELDS = {
  USER_ID: "userId",
  EMAIL: "email",
  ROLE: "role",
  FIRST_NAME: "firstName",
  LAST_NAME: "lastName",
} as const;

/**
 * Roles that an admin may assign when creating a new user.
 */
export const ADD_USER_ALLOWED_ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;

/**
 * Roles that an admin may assign when updating an existing user's role.
 */
export const UPDATE_ROLE_ALLOWED_ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;

export const USER_SORT_FIELDS = ["name", "role", "status", "lastLogin"] as const;
export const USER_SORT_ORDERS = ["asc", "desc"] as const;
