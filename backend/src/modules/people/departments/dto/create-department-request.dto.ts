/** Request body for POST /api/v1/departments. */
export interface CreateDepartmentRequestDto {
  /** Department name. Trimmed and required; must be unique among active departments. */
  name: string;
}
