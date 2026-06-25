/**
 * Employee summary embedded in team responses.
 */
export interface TeamEmployeeResponseDto {
  id: string;
  fullName: string;
  companyEmail: string;
  jobTitle: string | null;
  /** Google profile picture URL; null when the account has no photo. */
  avatarUrl: string | null;
}
