/**
 * One row in the admin user list.
 */
export interface UserListItemDto {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  employeeId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  employeeStatus: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}
