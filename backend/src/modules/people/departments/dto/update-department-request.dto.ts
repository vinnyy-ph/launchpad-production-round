/** Request body for PATCH /api/v1/departments/:departmentId. */
export interface UpdateDepartmentRequestDto {
  /** New department name. Trimmed and required; must be unique among active departments. */
  name: string;
}
