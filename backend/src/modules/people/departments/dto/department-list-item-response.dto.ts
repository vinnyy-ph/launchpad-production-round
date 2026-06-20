/**
 * A single department row returned to HR, including the number of employees
 * currently assigned (used both for display and to gate deletion).
 */
export interface DepartmentListItemResponseDto {
  id: string;
  name: string;
  /** Count of employees referencing this department. */
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
}
