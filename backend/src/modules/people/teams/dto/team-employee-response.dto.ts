/**
 * Employee summary embedded in team responses.
 */
export interface TeamEmployeeResponseDto {
  id: string;
  fullName: string;
  companyEmail: string;
  jobTitle: string | null;
}
