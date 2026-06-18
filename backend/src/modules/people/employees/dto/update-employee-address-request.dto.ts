/**
 * Structured address fields accepted when HR edits an employee profile.
 * A null parent address clears the stored address row; null child fields clear individual values.
 */
export interface UpdateEmployeeAddressRequestDto {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
}
